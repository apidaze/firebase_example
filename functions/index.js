const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

function buildDialplanForIncomingCalls(firebaseRefKey) {
  let xml =
  "<document>\n" +
  " <variables>" +
  "   <firebaseRefKey>" + firebaseRefKey + "</firebaseRefKey>" +
  " </variables>" +
  " <work>\n" +
  "   <answer/>\n" +
  "   <wait>2</wait>\n" +
  "   <speak>Please wait, we are processing your call</speak>\n" +
  "   <wait>60</wait>\n" +
  "   <speak>Sorry, it looks like nobody is available to answer, bye.</speak>\n" +
  "   <hangup/>\n" +
  " </work>\n" +
  "</document>\n";

  return xml;
}

admin.database().ref('number').on('value', function(snapshot) {
  console.log("numbers updated", JSON.stringify(snapshot.val()))
  console.log("numbers updated", snapshot.val())
  callingNumber = snapshot.val();
});

const incomingCallsRef = admin.database().ref("incomingcalls");
let callingNumber = "0000000000";

exports.apidazeExternalScript = functions.https.onRequest((request, response) => {
  console.log("request.method	:", JSON.stringify(request.method	))
  console.log("request.query : ", JSON.stringify(request.query))
  console.log("request.body : ", JSON.stringify(request.body))
  response.set("content-type", "text/xml");

  if (request.query.command === "interceptCall") {
    let xml =
    "<document>\n" +
    " <work>\n" +
    "   <answer/>\n" +
    "   <wait>2</wait>\n" +
    "   <intercept>" + request.query.uuid_to_intercept + "</intercept>" +
    "   <hangup/>\n" +
    " </work>\n" +
    "</document>\n";

    response.send(xml);
    return;
  }

  if (request.query.command === "placeCall") {
    let xml =
    "<document>\n" +
    " <work>\n" +
    "   <ringready/>\n" +
    "   <dial caller-id-number='" + callingNumber + "'>\n" +
    "     <number>" + request.query.number_to_call + "</number>\n" +
    "   </dial>\n" +
    "   <hangup/>\n" +
    " </work>\n" +
    "</document>\n";

    response.send(xml);
    return;
  }


  if (request.query.exiting !== "true"){
    // Received new request from APIdaze to process call, send XML back and add call to database
    let ref = incomingCallsRef.push()
    ref.set(request.query);

    response.send(buildDialplanForIncomingCalls(ref.key));
    return;
  } else {
    // Received request with 'exiting' parameter set to true, remove call from database
    incomingCallsRef.child(request.query.firebaseRefKey).remove()
  }

  response.send(buildDialplanForIncomingCalls());
});
