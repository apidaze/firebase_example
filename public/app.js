$(document).ready(function(){
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
  const outgoingCallStartButtonObj = document.getElementById("call");
  const outgoingCallHangupButtonObj = document.getElementById("hangup");
  const outgoingCallNumberObj = document.getElementById("number_to_call");

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

  $("#invite_number_to_conference").on("click", "input[type='button']", function(){
    console.log("Clicked invite");
    var number = $("#invite_number_to_conference input[type='text']").val();
    console.log("Number : " + number);
    call.inviteToConference(room_name, number, "33170567760");
  });
  $("tbody").on("click", "input.kick_button", function(){
    var sessid = $(this).attr("sessid");
    console.log("Clicked on kick button sessid : " + sessid);
    call.kickFromConference(room_name, sessid);
  });
  $("tbody").on("click", "input.mute_button", function(){
    var conference_member_id = $(this).attr("confMemberID");
    console.log("Clicked on mute button conference_member_id : " + conference_member_id);
    var muted = $("#" + $(this).attr("sessid")).attr("muted");
    console.log("muted : " + muted);
    if (muted === "true") {
      call.unmuteInConference(room_name, conference_member_id);
    } else {
      call.muteInConference(room_name, conference_member_id);
    }
  });
  $("#joinroom").click(function(){
    call = APIdazeClientObj.call(
      {
        command: "joinroom",
        username: "guest",
      },
      {
        onRoomInit: function(event) {
          console.log('RoomInit : ' + JSON.stringify(event.roomname));
          var room = event.roomname;
          $("#joinroom").attr("disabled", true);
          $("#my_status_inroom").text("In '" + room + "'");
          room_name = room;
        },
        onRoommembers: function(event) {
          console.log('Got members for this room : ' + JSON.stringify(event.members));
          members_in_room = event.members;
          other_members_in_room = [];
          $("#members_in_room_id > tbody").empty();
          if(typeof members_in_room !== "undefined" && members_in_room !== null && call !== null) {
            members_in_room.forEach(function (member) {
              console.log("call.callID : " + call.callID);
              console.log("member.sessid : " + member.sessid);
              $("#invite_number_to_conference input").attr("disabled", false);
              //	$("#members_in_room_id > tbody").append('<tr id="invite_number_to_conference"><td style="width: 150px"><input type="text" placeholder="E.g. : 33123456789"/></td><td><input type="button" style="width: 90px" value="Call" /></td></tr>');
              if (member.sessid === call.callID) {
                $("#members_in_room_id > tbody").append('<tr id="' + member.sessid +'" muted=false><td style="width: 150px">' + member.nickname + ' (me)</td><td style="width: 100px" id="' + member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Leave" /></td></tr>');
                current_member_in_room = member;
              } else {
                $("#members_in_room_id > tbody").append('<tr id="' + member.sessid +'" muted=false><td style="width: 150px">' + member.nickname + '</td><td style="width: 100px" id="' + member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + member.conferenceMemberID + '" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + member.sessid + '" type="button" style="width: 90px" value="Kick" /></td></tr>');
                other_members_in_room.push(member);
              }
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
          $("#members_in_room_id > tbody").append('<tr id="' + event.member.sessid +'" muted=false><td style="width: 150px">' + event.member.nickname + ' </td><td style="width: 150px" id="' + event.member.sessid + '-energyscore"></td><td><input class="mute_button" confMemberID="' + event.member.conferenceMemberID + '" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Toggle Mute" /><input class="kick_button" sessid="' + event.member.sessid + '" type="button" style="width: 90px" value="Kick" /></td></tr>');
        },
        onLeftroom: function(event) {
          console.log('Member left : ' + JSON.stringify(event.member));
          $("#" + event.member.sessid).remove();
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
          $("#" + event.member.sessid + "-energyscore").text(event.member.energyScore);
          if (event.member.muted === true) {
            $("#" + event.member.sessid + " td").css('background-color', 'red');
            $("#" + event.member.sessid).attr("muted", true);
            $("#" + event.member.sessid + "-energyscore").text('N/A');
          } else {
            $("#" + event.member.sessid + " td").css('background-color', 'white');
            $("#" + event.member.sessid).attr("muted", false);
          }
        },
        onHangup: function(){
          console.log('Hangup ; Conference ');
          $("#joinroom").attr("disabled", false);
          $("#my_status_inroom").empty();
          $("#members_in_room_id > tbody").empty();
          $("#invite_number_to_conference input").attr("disabled", true);
          resetClient();
        }
      });
    });
  })
