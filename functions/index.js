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

const incomingCallsRef = admin.database().ref("incomingcalls");

exports.apidazeExternalScript = functions.https.onRequest((request, response) => {
  console.log("request.method	:", JSON.stringify(request.method	))
  console.log("request.query : ", JSON.stringify(request.query))
  console.log("request.body : ", JSON.stringify(request.body))

  if (request.query.exiting !== "true"){
    // Received new request from APIdaze to process call, send XML back and add call to database
    let ref = incomingCallsRef.push()
    ref.set(request.query);

    response.set("content-type", "text/xml");
    response.send(buildDialplanForIncomingCalls(ref.key));
    return;
  } else {
    // Received request with 'exiting' parameter set to true, remove call from database
    incomingCallsRef.child(request.query.firebaseRefKey).remove()
  }

  response.set("content-type", "text/xml");
  response.send(buildDialplanForIncomingCalls());
});
