const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

function buildDialplanForIncomingCalls(firebaseRefKey) {
  let xml =
  "<document>\n" +
  " <variables>\n" +
  "   <firebaseRefKey>" + firebaseRefKey + "</firebaseRefKey>\n" +
  " </variables>\n" +
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

exports.apidazeOnCallerHangup = functions.https.onRequest((request, response) => {
  console.log("request.method :", JSON.stringify(request.method ));
  console.log("request.query : ", JSON.stringify(request.query));
  console.log("request.body : ", JSON.stringify(request.body));
  response.set("content-type", "text/xml");
  var xml =
    "<document>\n" +
    " <work>\n" +
    "   <speak>Please wait for someone to join this call</speak>\n" +
    "   <wait>10</wait>\n" +
    " </work>\n" +
    "</document>\n";

  response.send(xml);
  return;
});


exports.apidazeExternalScript = functions.https.onRequest((request, response) => {
  console.log("request.method	:", JSON.stringify(request.method	))
  console.log("request.query : ", JSON.stringify(request.query))
  console.log("request.body : ", JSON.stringify(request.body))
  response.set("content-type", "text/xml");

  if (request.query.command === "auth") {
    if (request.query.userid && typeof request.query.userid === "string") {
      var xml =
        "<document>\n" +
        " <variables>\n" +
        "   <userid>" + request.query.userid + "</userid>\n" +
        " </variables>\n" +
        "</document>\n";
    }

    response.status(200);
    response.send(xml);
    return;
  }

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
    "   <dial caller-hangup-url='https://" +  request.hostname + "/apidazeOnCallerHangup' caller-id-number='" + callingNumber + "'>\n" +
    "     <number>" + request.query.number_to_call + "</number>\n" +
    "   </dial>\n" +
    "   <hangup/>\n" +
    " </work>\n" +
    "</document>\n";

    response.send(xml);
    return;
  }

  if (request.query.command === "joinRoom") {
    let xml =
    "<document>\n" +
    " <work>\n" +
    "   <answer/>\n" +
    "   <wait>2</wait>\n" +
    "   <speak>Welcome, you are joining the conference</speak>\n" +
    "   <conference username='" + request.query.userName + "'>test</conference>\n" +
    "   <wait>5</wait>\n" +
    "   <hangup/>\n" +
    " </work>\n" +
    "</document>\n";

    response.send(xml);
    return;
  }

  if (request.query.exiting !== "true")
  {
    // Received new request from APIdaze to process an incoming call,
    // send XML back and add call to database
    if (typeof request.query.caller_id_number === "string" && typeof request.query.caller_username === "string") {
      let ref = incomingCallsRef.push()
        ref.set(request.query);

      response.send(buildDialplanForIncomingCalls(ref.key));
      return;
    } else {
      response.status(200);
      response.send("");
      return;
    }
  } else {
    // Received request with 'exiting' parameter set to true, remove call from database
    incomingCallsRef.child(request.query.firebaseRefKey).remove()
  }

  response.status(200);
  response.send(buildDialplanForIncomingCalls());
});
