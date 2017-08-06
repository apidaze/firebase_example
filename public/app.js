function updateActiveNumbers(numberString) {
  activeNumberObj.innerHTML = numberString;
  incomingCallNumberObj.innerHTML = numberString;
}

function buildIncomingCallsList(callsList) {
  incomingCallsTableObj.innerHTML = "";

  if (callsList === null) {
    return;
  }

  Object.keys(callsList).map(function(firebaseKey, index) {
    console.log("[buildIncomingCallsList] callsList[firebaseKey] :", JSON.stringify(callsList[firebaseKey]))

    let html =
    '<td style="width: 150px">' +
    '<div>' + callsList[firebaseKey].caller_id_number + '</div>' +
    '</td>' +
    '<td>' +
    '<input class="answer-button" type="button" style="width: 90px" value="Answer" />' +
    '</td>' +
    '<td>' +
    '<input class="hangup-button" type="button" style="width: 90px" value="Hangup" disabled/>' +
    '</td>';

    let tr = document.createElement("tr");
    tr.setAttribute("id", firebaseKey)
    tr.setAttribute("uuid", callsList[firebaseKey].uuid)
    tr.innerHTML = html;

    let onAnswerClicked = function(){
      console.log("Clicked to answer call, uuid : " + this.parentNode.parentNode.getAttribute("uuid"));
      this.disabled = true;
      this.parentNode.parentNode.querySelector("input.hangup-button").disabled = false;

      let callUUID = this.parentNode.parentNode.getAttribute("uuid");
      call = APIdazeClientObj.call(
        {
          destination_number: "interception",
          command: "interceptCall",
          uuid_to_intercept: callUUID
        },
        {
          onHangup: function() {
            console.log("Call hangup");
            resetClient();
          }
        }
      );
    }
    let onHangupClicked = function(){
      console.log("Clicked to hangup call, uuid : " + this.parentNode.parentNode.getAttribute("uuid"));
      call.hangup();
      this.disabled = true
    }

    tr.getElementsByClassName("answer-button")[0].onclick = onAnswerClicked;
    tr.getElementsByClassName("hangup-button")[0].onclick = onHangupClicked;

    incomingCallsTableObj.appendChild(tr);
  });
}

console.log("Initialized");
var current_member_in_room = {}
var members_in_room = [];
var other_members_in_room = [];
var room_name = '';

// APIdaze APIdazeClientObj initialization
var call = {};
let APIdazeCallObj = {};
var audiostarted = false;
let APIdazeClientObj = null;
let APIdazeAPIkey = null;

const activeNumberObj = document.getElementById("activeNumberId");
const apiKeyObj = document.getElementById("apiKeyId");
const callActionsSectionObj = document.getElementById("callActionsSectionId");
const incomingCallNumberObj = document.getElementById("incomingCallNumberId");
const incomingCallsTableObj = document.getElementById("incomingCallsTableId");
const outgoingCallStartButtonObj = document.getElementById("outgoingCallStartButtonId");
const outgoingCallHangupButtonObj = document.getElementById("outgoingCallHangupButtonId");
const outgoingCallNumberObj = document.getElementById("outgoingCallNumberId");
const inviteNumberToConferenceButtonObj = document.getElementById("inviteNumberToConferenceButtonId");
const inviteNumberToConferenceTextObj = document.getElementById("inviteNumberToConferenceTextId");
const myStatusInRoomObj = document.getElementById("myStatusInRoomId");
const joinRoomButtonObj = document.getElementById("joinRoomButtonId");
const membersInRoomObj = document.getElementById("membersInRoomId");

/**
* Firebase listeners
*/
firebase.database().ref('number').on('value', function(snapshot) {
  console.log("numbers updated", JSON.stringify(snapshot.val()))
  updateActiveNumbers(snapshot.val() || "Please set the 'number' attribute in Firebase");
});

firebase.database().ref('apikey').on('value', function(snapshot) {
  console.log("apikey updated", JSON.stringify(snapshot.val()))
  apiKeyObj.innerHTML = snapshot.val() || "Please set the 'apikey' attribute in Firebase";
  APIdazeAPIkey = snapshot.val();
  if (snapshot.val() === null) {
    callActionsSectionObj.style.display = "none";
  } else {
    callActionsSectionObj.style.display = "inherit";
    resetClient();
  }
});

firebase.database().ref('incomingcalls').on('value', function(snapshot) {
  console.log("incomingcalls updated", JSON.stringify(snapshot.val()))
  buildIncomingCallsList(snapshot.val())
});

function resetClient() {
  APIdazeClientObj && APIdazeClientObj.freeALL();
  APIdazeClientObj = new APIdaze.CLIENT({
    type:"webrtc",
    apiKey: APIdazeAPIkey,
    forcewsurl: "wss://ws2-old.apidaze.io:443",
    onReady: function(){
      outgoingCallStartButtonObj.disabled = false;
      outgoingCallStartButtonObj.setAttribute("value", "Call");
    },
    onDisconnected: function(){
      resetClient();
      outgoingCallStartButtonObj.disabled = false;
      outgoingCallStartButtonObj.setAttribute("value", "Call");
    }
  });
};

// Place a call
outgoingCallStartButtonObj.onclick = function(){
  outgoingCallStartButtonObj.disabled = true;
  outgoingCallStartButtonObj.setAttribute("value", "Calling");

  call = APIdazeClientObj.call(
    {
      destination_number: outgoingCallNumberObj.value,
      number_to_call: outgoingCallNumberObj.value,
      command: "placeCall"
    },
    {
      onRinging: function() {
        console.log("Call ringing");
        outgoingCallStartButtonObj.setAttribute("value", "Ringing");
      },
      onAnswer: function() {
        console.log("Call answered");
        outgoingCallHangupButtonObj.disabled = false;
        outgoingCallStartButtonObj.setAttribute("value", "In call");
        audiostarted = true;
      },
      onHangup: function() {
        console.log("Call hangup");
        outgoingCallHangupButtonObj.disabled = true;
        outgoingCallStartButtonObj.disabled = false;
        outgoingCallStartButtonObj.setAttribute("value", "Call");
        resetClient();
      }
    }
  );
}

outgoingCallHangupButtonObj.onclick = function(){
  call.hangup();
  outgoingCallHangupButtonObj.disabled = true;
}

inviteNumberToConferenceButtonObj.onclick = function(){
  console.log("Clicked invite");
  var number = inviteNumberToConferenceTextObj.value;
  console.log("Number : " + number);
  call.inviteToConference(room_name, number, "33170567760");
}

joinRoomButtonObj.onclick = function(){
  call = APIdazeClientObj.call(
    {
      command: "joinRoom",
      username: "guest",
    },
    {
      onRoomInit: function(event) {
        console.log('RoomInit : ' + JSON.stringify(event.roomname));
        joinRoomButtonObj.disabled = true;
        myStatusInRoomObj.innerHTML = "In '" + event.roomname + "'";

        room_name = event.roomname;
      },
      onRoommembers: function(event) {
        console.log('Got members for this room : ' + JSON.stringify(event.members));
        members_in_room = event.members;
        other_members_in_room = [];
        membersInRoomObj.innerHTML = "";
        if(typeof members_in_room !== "undefined" && members_in_room !== null && call !== null) {
          members_in_room.forEach(function (member) {
            console.log("call.callID : " + call.callID);
            console.log("member.sessid : " + member.sessid);
            inviteNumberToConferenceTextObj.disabled = false;
            let tr = document.createElement("tr");
            tr.setAttribute("id", member.sessid);
            tr.setAttribute("muted", false);

            if (member.sessid === call.callID) {
              tr.innerHTML =
              '<td style="width: 150px">' + member.nickname + ' (me)</td>' +
              '<td style="width: 100px" id="' + member.sessid + '-energyscore"></td>' +
              '<td>' +
              ' <input class="mute_button" confmemberid="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" />' +
              ' <input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Leave" />'+
              '</td>';

              current_member_in_room = member;
            } else {
              tr.innerHTML =
              '<td style="width: 150px">' + member.nickname + ' (me)</td>' +
              '<td style="width: 100px" id="' + member.sessid + '-energyscore"></td>' +
              '<td>' +
              ' <input class="mute_button" confmemberid="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" />' +
              ' <input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Kick" />'+
              '</td>';

              other_members_in_room.push(member);
            }

            // conference control kick mute
            tr.querySelector("input.kick_button").onclick = function(){
              console.log("Clicked on kick button sessid : " + this.getAttribute("sessid"));
              call.kickFromConference(room_name, this.getAttribute("sessid"));
            }

            // conference control mute mute
            tr.querySelector("input.mute_button").onclick = function(){
              console.log("Clicked on mute button conference_member_id : " + this.getAttribute("confmemberid"));
              var muted = this.parentNode.parentNode.getAttribute("muted");
              console.log("muted : " + muted);
              if (muted === "true") {
                call.unmuteInConference(room_name, this.getAttribute("confmemberid"));
              } else {
                call.muteInConference(room_name, this.getAttribute("confmemberid"));
              }
            }


            membersInRoomObj.appendChild(tr);
          });
        }
        console.log('current_member_in_room : ' + JSON.stringify(current_member_in_room));
        console.log('other_members_in_room : ' + JSON.stringify(other_members_in_room));
        console.log('members_in_room : ' + JSON.stringify(members_in_room));
      },
      onJoinedroom: function(event) {
        console.log('New member : ' + JSON.stringify(event.member));
        members_in_room.push(event.member);
        other_members_in_room.push(event.member);
        let tr = document.createElement("tr");
        tr.setAttribute("id", member.sessid);
        tr.setAttribute("muted", false);

        tr.innerHTML =
        '<td style="width: 150px">' + event.member.nickname + ' </td>' +
        '<td style="width: 150px" id="' + event.member.sessid + '-energyscore"></td>' +
        '<td>' +
        ' <input class="mute_button" confmemberid="' + event.member.conferenceMemberID + '" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" />' +
        ' <input class="kick_button" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Kick" />' +
        '</td>';

        // conference control kick mute
        tr.querySelector("input.kick_button").onclick = function(){
          console.log("Clicked on kick button sessid : " + this.getAttribute("sessid"));
          call.kickFromConference(room_name, this.getAttribute("sessid"));
        }

        // conference control mute mute
        tr.querySelector("input.mute_button").onclick = function(){
          console.log("Clicked on mute button conference_member_id : " + this.getAttribute("confmemberid"));
          var muted = this.parentNode.parentNode.getAttribute("muted");
          console.log("muted : " + muted);
          if (muted === "true") {
            call.unmuteInConference(room_name, this.getAttribute("confmemberid"));
          } else {
            call.muteInConference(room_name, this.getAttribute("confmemberid"));
          }
        }

        membersInRoomObj.appendChild(tr);
      },
      onLeftroom: function(event) {
        console.log('Member left : ' + JSON.stringify(event.member));
        document.getElementById(event.member.sessid).remove();
        if(call !== null && event.member.sessid === call.callID) {
          current_member_in_room = '';
        }
        for (var index = 0; index < members_in_room.length; index++){
          if (members_in_room[index].sessid === event.member.sessid) {
            members_in_room.splice(index,1);
            console.log('after user left members : ' + JSON.stringify(members_in_room));
          }
        }
        for (var index = 0; index < other_members_in_room.length; index++){
          if (other_members_in_room[index].sessid === event.member.sessid) {
            other_members_in_room.splice(index,1);
            console.log('after user left other members : ' + JSON.stringify(other_members_in_room));
          }
        }
      },
      onTalking: function(event) {
        console.log("Talking event : " + JSON.stringify(event.member));
        let memberObj = document.getElementById(event.member.sessid);
        let energyScoreTextObj = document.getElementById(event.member.sessid + "-energyscore");

        energyScoreTextObj.innerHTML = event.member.energyScore;
        if (event.member.muted === true) {
          memberObj.querySelector("td").style.backgroundColor = "red";
          memberObj.setAttribute("muted", true);
          energyScoreTextObj.innerHTML = "N/A";
        } else {
          memberObj.querySelector("td").style.backgroundColor = "white";
          memberObj.setAttribute("muted", false);
        }
      },
      onHangup: function(){
        console.log('Hangup ; Conference ');
        joinRoomButtonObj.disabled = false;
        myStatusInRoomObj.innerHTML = "";
        membersInRoomObj.innerHTML = "";
        inviteNumberToConferenceTextObj.disabled = true;
        inviteNumberToConferenceButtonObj.disabled = true;
        resetClient();
      }
    });
  }
