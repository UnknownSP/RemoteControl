const Discord = require('discord.js');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
var NodeWebcam = require( "node-webcam" );
var fs = require('fs');
const { Client, MessageAttachment } = require('discord.js');
const client = new Discord.Client();
const proc = require('child_process');
const fetch = require('node-fetch');
const Canvas = require('canvas');
const { Console } = require('console');

const COMMAND_PREFIX = "/"
var server;

var token = "";
var COM_RECEIVE_CHANNEL = "";
var COM_RECEIVE_CHANNEL_ID = "";

var token_file = fs.readFileSync("token.txt", 'utf8');

token = token_file.toString().split('\r\n')[3];//個人鯖
COM_RECEIVE_CHANNEL = token_file.toString().split('\r\n')[4];
COM_RECEIVE_CHANNEL_ID = token_file.toString().split('\r\n')[5];

var _display_info = false;
var _display = false;

var max_setCount = 10;
var setCount = 0;
var setTimerObj = new Array(max_setCount).fill(null);

var max_sendCount = 10;
var sendCount = 0;
var sendcheckCount = 0;
var sendcheckCommand = new Array(max_sendCount).fill(null);
var _sendcheck_flag = new Array(max_sendCount).fill(false);

var opts = {
    width: 1920,
    height: 1080,
    quality: 80,
    frames: 60,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: false
};
var Webcam = NodeWebcam.create( opts );

var intervalObj;

const port = new SerialPort('COM4', { baudRate: 115200 }, function(err){
    if(err){
        console.log('Com Port Error.');
        setTimeout(sendToDiscord, 2000, "[ErrorCode : 01]\nArduinoとの通信に失敗しました。5秒後に自動復帰を行います。");
        setTimeout(portOpen,5000);
    }
});

port.on('open', function (err) {
    if(err){
        console.log('Com Port Error.');
        setTimeout(sendToDiscord, 2000, "[ErrorCode : 01]\nArduinoとの通信に失敗しました。5秒後に自動復帰を行います。");
        setTimeout(portOpen,5000);
        return;
    }
    console.log('Serial open.');
    setTimeout(sendToDiscord, 2000, "Arduinoとの通信を開始しました。");
    intervalObj = setInterval(writeToArduino, 600000, 'GET_INFO\n', "not_Timer");
});

function portOpen(){
    port.open(function (err) {
        if(err){
            console.log(err);
            setTimeout(sendToDiscord, 2000, "[ErrorCode : 03]\nArduinoとの通信復帰に失敗しました。");
        }
        setTimeout(sendToDiscord, 2000, "Arduinoとの通信復帰成功。");
    });
}
function resetPort(){
    try {
        clearInterval(intervalObj);
        port.close(function (err) {
            if(err){
                console.log(err);
            }
        });
        setTimeout(portOpen,5000);
    } catch (error) {
        console.log(error);
    }
}

const parser = port.pipe(new Readline({ delimiter: '\n' }));
parser.on('data', data =>{
    console.log('from arduino:', data);
    var send_mess = "";
    if(data.indexOf("Temperature : ") != -1){
        var Temp = parseFloat(data.substr(14).slice(0,-2));
        send_mess += "温度 : "+ Temp +" [℃]";
    }else if(data.indexOf("Humidity : ") != -1){
        var Humid = parseFloat(data.substr(11).slice(0,-2));
        send_mess += "湿度 : "+ Humid +" [%]";
    }else if(data.indexOf("Brightness : ") != -1){
        var Bright = Number(data.substr(13).slice(0,-1));
        if(Bright <= 700){
            send_mess += "部屋はとても明るいです。";
        }else if(Bright <= 800){
            send_mess += "部屋は明るいです。";
        }else if(Bright <= 850){
            send_mess += "部屋は少し明るいです。";
        }else if(Bright <= 900){
            send_mess += "部屋は少し暗いです。";
        }else if(Bright <= 950){
            send_mess += "部屋は暗いです。";
        }else if(Bright <= 1024){
            send_mess += "部屋はとても暗いです。";
        }
        send_mess += " (RawData : " + Bright + ")\n";
        _display = false;
    }else if(data.indexOf("Received : ") != -1){
        if(data.indexOf(sendcheckCommand[sendcheckCount])){
            _sendcheck_flag[sendcheckCount] = false;
            sendcheckCount++;
            if(sendcheckCount == max_sendCount) sendcheckCount = 0;
        }
    }
    if(_display_info){
        if(send_mess != ""){
            sendToDiscord(send_mess);
        }
        if(!_display){
            sendToDiscord("-------------------------------------");
            _display_info = false;
        }
    }
});

function sendToDiscord(mess){
    client.channels.cache.get(COM_RECEIVE_CHANNEL_ID).send(mess);
}

function sendCheck(check_number){
    if(_sendcheck_flag[check_number]){
        console.log('Could not Send');
        sendToDiscord("[ErrorCode : 02]\nArduinoとの通信に失敗しました。5秒後に自動復帰を行います。");
        resetPort();
        sendcheckCount = 0;
        sendCount = 0;
        for(var i=0; i<max_sendCount; i++){
            sendcheckCommand[i] = null;
            _sendcheck_flag[i] = false;
        }
        return;
    }
    console.log("Complete");
}

function writeToArduino(data, deleteTimer_command) {
    console.log('Write: ' + data);
    port.write(data, function(err, results) {
        if(err) {
            console.log('Err: ' + err);
            console.log('Results: ' + results);
        }
    });
    sendcheckCommand[sendCount] = data;
    _sendcheck_flag[sendCount] = true;
    setTimeout(sendCheck, 2000, sendCount);
    sendCount++;
    if(sendCount == max_sendCount) sendCount = 0;

    if(deleteTimer_command != "not_Timer"){
        deleteTimer_Com(deleteTimer_command);
    }
}
function clearTimer_Num(deleteTimer_number){
    if(setTimerObj[deleteTimer_number] == null){
        sendToDiscord("[ErrorCode : 40]\n指定された予約は存在しません");
        return;
    }
    clearTimeout(setTimerObj[deleteTimer_number]);
    setTimerObj.splice(deleteTimer_number,1);
    setTimerObj[setTimerObj.length] = null;
    try {
        var setTimer_file = fs.readFileSync("setTimer.txt", 'utf8');
    } catch (error) {
        console.log(error);
        return;
    }
    var setTimer_data = setTimer_file.toString().split('\n');
    var writeLine = "";
    var writeCount = 0;
    for(var i=0; i<setTimer_data.length - 1;i++){
        if(i != deleteTimer_number){
            writeLine += writeCount + ","+ setTimer_data[i].split(',')[1] +","+ setTimer_data[i].split(',')[2] +","+ setTimer_data[i].split(',')[3] + "\n";
            writeCount ++;
        }
    }
    try {
        fs.writeFileSync("setTimer.txt", writeLine);
    } catch (error) {
        console.log(error);
        return;
    }
    sendToDiscord("予約を消去しました");
    sendSetTimer();
    console.log('予約消去完了');
    setCount -= 1;
}

function deleteTimer_Com(deleteTimer_command){
    try {
        var setTimer_file = fs.readFileSync("setTimer.txt", 'utf8');
    } catch (error) {
        console.log(error);
        return;
    }
    var setTimer_data = setTimer_file.toString().split('\n');
    var writeLine = "";
    var writeCount = 0;
    for(var i=0; i<setTimer_data.length - 1;i++){
        if(setTimer_data[i].split(',')[2] == deleteTimer_command){
            setTimerObj.splice(i,1);
            setTimerObj[setTimerObj.length] = null;
        }else{
            writeLine += writeCount + ","+ setTimer_data[i].split(',')[1] +","+ setTimer_data[i].split(',')[2] +","+ setTimer_data[i].split(',')[3] + "\n";
            writeCount ++;
        }
    }
    try {
        fs.writeFileSync("setTimer.txt", writeLine);
    } catch (error) {
        console.log(error);
        return;
    }
    sendToDiscord("予約 " + deleteTimer_command+" のコマンド送信完了");
    setTimeout(sendSetTimer,1000);
    console.log('予約実行完了');
    setCount -= 1;
}

function sendSetTimer(){
    try {
        var setTimer_file = fs.readFileSync("setTimer.txt", 'utf8');
    } catch (error) {
        console.log(error);
        return;
    }
    var setTimer_data = setTimer_file.toString().split('\n');
    if(setTimer_data.length == 1){
        sendToDiscord("現在予約はありません");
        sendToDiscord("-------------------------------------");
        return;
    }
    var send_mess = "現在の予約は以下のようになっています\n";
    for(var i=0; i<setTimer_data.length-1;i++){
        send_mess += "[" +i+"]\n" + new Date(Number(setTimer_data[i].split(',')[1])) +"\n"+ setTimer_data[i].split(' ')[1] +" "+ setTimer_data[i].split(' ')[2] + "\n";
    }
    send_mess += "-------------------------------------";
    sendToDiscord(send_mess);
}

client.login(token);

client.on("ready", ()=> {
    console.log("起動完了....");
    try {
        var setTimer_file = fs.readFileSync("setTimer.txt", 'utf8');
    } catch (error) {
        console.log(error);
        return;
    }
    var setTimer_data = setTimer_file.toString().split('\n');
    if(setTimer_data.length == 1){
        return;
    }
    var writeLine = "";
    var writeCount = 0;
    for(var i=0; i<setTimer_data.length - 1;i++){
        var timeDiff = Number(setTimer_data[i].split(',')[1]) - Date.now();
        if(timeDiff > 0){
            setTimerObj[setCount] = setTimeout(writeToArduino, timeDiff, setTimer_data[i].split(',')[3], setTimer_data[i].split(',')[2]);
            writeLine += writeCount + ","+ setTimer_data[i].split(',')[1] +","+ setTimer_data[i].split(',')[2] +","+ setTimer_data[i].split(',')[3] + "\n";
            writeCount ++;
            _set_timer = false;
            setCount++; 
        }
    }
    try {
        fs.writeFileSync("setTimer.txt", writeLine);
    } catch (error) {
        console.log(error);
        return;
    }
    if(writeCount == 0){
        return;
    }
    sendToDiscord("起動前に予約されていた予約をセットしました\n");
    sendSetTimer();
});

client.on("message",async message => {
    var receivemessage = message.content.replace(/　/g," ").split(' ');
    var channelname = message.channel.name;
    var receivecommand = receivemessage[0];
    var argument_2 = receivemessage[1];
    var argument_3 = receivemessage[2];
    var argument_4 = receivemessage[3];
    var argument_5 = receivemessage[4];
    var send_command = "";
    var _set_timer = false;
    var set_time = 0;

    if(argument_3 == undefined){
        argument_3 = "";
    }

    if(message.author.bot){
        return;
    }
    
    console.log("-------------------------------------");
    console.log(receivemessage);
    console.log(message.author.username+" (id : "+message.id+")");

    switch(receivecommand){
        case COMMAND_PREFIX+"ip":
            var getURL = "https://checkip.amazonaws.com";
            fetch(getURL)
                .then(res => res.text())
                .then((text) => {
                    console.log(text);
                    sendToDiscord("現在のIPは\n\n"+ text);
                })
                .catch(err => console.log(err));
            break;
        case COMMAND_PREFIX+"reset":
            resetPort();
            break;
        case COMMAND_PREFIX+"get":
            if(argument_2 == null){
                sendToDiscord("[ErrorCode : 10]\nUsage:  /get [Command]");
                break;
            }
            switch(argument_2){
                case "Info":
                    _display_info = true;
                    _display = true;
                    send_command = "GET_INFO\n";
                    break;
                case "Photo":
                    Webcam.capture( "picture", async function( err, data ) {
                        if(err){
                            console.log("WebCam Error");
                            sendToDiscord("[ErrorCode : 30]\nWebカメラが接続されていません");
                            return;
                        }
                        const canvas = Canvas.createCanvas(1920, 1080);
                        const ctx = canvas.getContext('2d');
                        const background = await Canvas.loadImage('./picture.jpg');
                        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
                        const attachment = new MessageAttachment(canvas.toBuffer(), 'picture.jpg');
                        sendToDiscord(attachment);
                    } );
                    break;
                case "Timer":
                    sendSetTimer();
                    break;
                default:
                    sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                    break;
            }
            break;
        case COMMAND_PREFIX+"clear":
            if(argument_2 == null){
                sendToDiscord("[ErrorCode : 10]\nUsage:  /clear [Timer Number]");
                break;
            }
            if(setCount == 0){
                sendToDiscord("現在予約はありません");
                break;
            }
            var Timer_num = Number(argument_2);
            if(Timer_num < 0 || Timer_num > (setCount-1)){
                sendToDiscord("[ErrorCode : 41]\nそのような予約はありません");
                break;
            }
            clearTimer_Num(Timer_num);
            break;
        case COMMAND_PREFIX+"set":
        case COMMAND_PREFIX+"send":
            if(receivecommand == (COMMAND_PREFIX+"set")){
                if(argument_2 == null || argument_3 == null || argument_4 == null){
                    sendToDiscord("[ErrorCode : 10]\nUsage:  /set [Target] [Command] [Time(m)]");
                    break;
                }
                if(argument_2 == "Webcam" && argument_3 == "Target"){
                    if(argument_5 == null){
                        sendToDiscord("[ErrorCode : 10]\nUsage:  /set Webcam Target [degree] [Time(m)]");
                        break;
                    }else{
                        set_time = Number(argument_5);
                    }
                }else{
                    set_time = Number(argument_4);
                }
                if(set_time > 0 && set_time <= 600){
                    _set_timer = true;
                    set_time = set_time *60 *1000;
                }else{
                    sendToDiscord("[ErrorCode : 50]\nTimerの指定時間は1～600分以内です");
                    break;
                }
            }else if(receivecommand == (COMMAND_PREFIX+"send")){
                if(argument_2 == null || argument_3 == null){
                    sendToDiscord("[ErrorCode : 10]\nUsage:  /send [Target] [Command]");
                    break;
                }   
            }
            switch(argument_2){
                case "TV":
                    switch(argument_3){
                        case "Power":
                            send_command = "TV_POWER\n";
                            break;
                        default:
                            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                            break;
                    }
                    break;
                case "Light":
                    switch(argument_3){
                        case "ON":
                            send_command = "LIGHT_ON\n";
                            break;
                        case "OFF":
                            send_command = "LIGHT_OFF\n";
                            break;
                        default:
                            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                            break;
                    }
                    break;
                case "AC":
                    switch(argument_3){
                        case "Stop":
                            send_command = "AC_STOP\n";
                            break;
                        case "Cool":
                            send_command = "AC_COOL\n";
                            break;
                        case "Heat":
                            send_command = "AC_HEAT\n";
                            break;
                        case "DeHumid":
                            send_command = "AC_DEHUMID\n";
                            break;
                        default:
                            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                            break;
                    }
                    break;
                case "Dyson":
                    switch(argument_3){
                        case "Power":
                            send_command = "DS_POWER\n";
                            break;
                        case "Cool":
                            send_command = "DS_COOL\n";
                            break;
                        case "HeatPlus":
                            send_command = "DS_HEAT_PLUS\n";
                            break;
                        case "HeatMinus":
                            send_command = "DS_HEAT_MINUS\n";
                            break;
                        case "AirPlus":
                            send_command = "DS_AIR_PLUS\n";
                            break;
                        case "AirMinus":
                            send_command = "DS_AIR_MINUS\n";
                            break;
                        default:
                            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                            break;
                    }
                    break;
                case "Webcam":
                    switch(argument_3){
                        case "R":
                            send_command = "SERVO_R\n";
                            break;
                        case "L":
                            send_command = "SERVO_L\n";
                            break;
                        case "Target":
                            if(argument_4 == null){
                                sendToDiscord("[ErrorCode : 10]\nUsage:  /send Webcam Target [degree]");
                                break;
                            }
                            var degree =  Number(argument_4);
                            if(degree >= 0 && degree <= 180){
                                send_command = "SERVO_TARGET_" + degree + "\n";
                            }else{
                                sendToDiscord("[ErrorCode : 60]\nWebCamの指定角度は0～180度以内です");
                            }
                            break;
                        default:
                            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
                            break;
                    }
                    break;
                default:
                    sendToDiscord("[ErrorCode : 20]\nそのようなデバイスはありません");
                    break;
            }
            break;
        default:
            sendToDiscord("[ErrorCode : 11]\nそのようなコマンドはありません");
            break;
    }

    if(send_command != ""){
        if(_set_timer){
            if(setCount >= max_setCount){
                sendToDiscord("[ErrorCode : 42]\n予約数が"+max_setCount+"に達しています。これ以上予約できません");
                return;
            }
            setTimerObj[setCount] = setTimeout(writeToArduino, set_time, send_command, message.content.replace(/　/g," "));
            var setDate = Date.now()+Number(set_time);
            try {
                fs.appendFileSync('setTimer.txt', setCount + ","+ (setDate) +","+ message.content.replace(/　/g," ") +","+ send_command);
            } catch (error) {
                console.log(error);
                return;
            }
            sendToDiscord("予約完了\n" + new Date(setDate)+ ", "+ argument_2 + ", "+ argument_3);
            _set_timer = false;
            setCount++;
        }else{
            writeToArduino(send_command, "not_Timer");
            sendToDiscord("コマンド送信完了\n" +argument_2 + ", "+ argument_3);
        }
    }

    console.log("-------------------------------------");
    sendToDiscord("-------------------------------------");
    
});