givedirect = {};
givedirect.horizonServer = "https://horizon.stellar.org";
givedirect.interstellarMultisigApi = "https://interstellar.exchange/backend/api/v1/transaction_envelope";

givedirect.processForm = function (source, destinations, amount, memo, submitButton) {

    var that = this;
    destinations = destinations.trim();

    var progressReport = $("#progressReport");
    progressReport.html("");

    progressReport.append("<strong>Progress Report</strong><br>");

    progressReport.append("Checking Memo Length <br>");

    if(memo.length > 26){
        progressReport.append("Memo length: " + memo.length + " &gt 26.<br> Aborting.");
        submitButton.show();
        return;
    }

    progressReport.append("Good. Memo length: " + memo.length + " &lt 26.<br>");

    progressReport.append("Checking Stellar Source Address: " + source + "<br>");

    try {
        var dummy = StellarSdk.Keypair.fromPublicKey(source);
        progressReport.append("Valid Stellar Source Address: " + source + "<br>");
    }
    catch (err) {
        Materialize.toast("Invalid Stellar Source Address", 4000, "red");
        progressReport.append("Oops. Invalid Stellar Source Address: " + source + "<br> Aborting");
        submitButton.show();
        return;
    }

    var invalidDestinations = [];
    var destinationArray = destinations.split("\n");
    var operations = [];
    var asset = StellarSdk.Asset.native();

    for (i = 0; i < destinationArray.length; i++) {

        var destinationToTest = destinationArray[i];
        progressReport.append((i + 1) + ": Checking Stellar Destination Address: " + destinationToTest + "<br>");

        try {
            var dummy = StellarSdk.Keypair.fromPublicKey(destinationToTest);

            var operation = StellarSdk.Operation.payment({
                destination: destinationToTest,
                asset: asset,
                amount: '' + amount,
            });

            operations.push(operation);

        }
        catch (err) {
            invalidDestinations.push(destinationToTest);
        }
    }

    if (invalidDestinations.length > 0) {
        progressReport.append("Error: The following destination addresses are invalid: <br> <ul>");

        for (i = 0; i < invalidDestinations.length; i++) {
            var invalidDestination = invalidDestinations[i];
            progressReport.append("<li>" + invalidDestination + "</li>");
        }

        progressReport.append("</ul>Aborting");
        submitButton.show();
        return;

    }

    progressReport.append("All " + destinationArray.length + " destination addresses are valid. Getting updated info for the source account <br> ");
    progressReport.append("... <br> ");
    progressReport.append("Please be patient while we get the latest source account information from the Internet<br> ");
    progressReport.append("... <br> ");
    progressReport.append("... <br> ");

    var server = new StellarSdk.Server(givedirect.horizonServer);

    server.loadAccount(source)
        .then(function (account) {

            if (account.signers.length < 2) {
                progressReport.append("The source account has not been set up for multisig. Aborting.");
                submitButton.show();
                return;
            }

            progressReport.append("Successfully acquired updated source account information from the Internet. <br> ");
            progressReport.append("Building transaction. <br> ");

            var builder = new StellarSdk.TransactionBuilder(account);

            builder = builder.addMemo(StellarSdk.Memo.text(memo));

            for (i = 0; i < operations.length; i++) {
                var operation = operations[i];
                builder.addOperation(operation);
            }

            transaction = builder.build();

            var xdr = transaction.toEnvelope().toXDR().toString('base64');

            progressReport.append(xdr);
            progressReport.append("<br>... <br> ");
            progressReport.append("Please be patient while we submit your transaction to Interstellar's Multisig Service <br> ");
            progressReport.append("... <br> ");
            progressReport.append("... <br> ");

            $.ajax({
                url: givedirect.interstellarMultisigApi,
                type: 'post',
                dataType: 'text',
                data: xdr,
                contentType: "text/plain; charset=UTF-8",
                success: function (data) {
                    progressReport.append("Successfully submitted transaction to Interstellar's Multisig Service <br> ");
                }
            });
        })
        .catch(function (e) {
            console.error(e);
            progressReport.append("There was a network error. Aborting.");
            submitButton.show();
            return;

        })

}

$(document).ready(function () {

    console.log(StellarSdk);
    console.log(window);

    var form = $("#form");
    var submitButton = $("#submitButton");
    var inputSource = $("#source");
    var destinations = $("#destinations");
    var memo = $("#memo");
    var amount = $("#amount");

    form.on("submit", function (event) {
        event.preventDefault();
        submitButton.hide();
        givedirect.processForm(inputSource.val(), destinations.val(), amount.val(), memo.val(), submitButton);
    });

});