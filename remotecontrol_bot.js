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

const port = new SerialPort('COM4', { baudRate: 115200 });
const parser = port.pipe(new Readline({ delimiter: '\n' }));

var _display_info = false;
var _display = false;

port.on('open', function () {
    console.log('Serial open.');
    setInterval(writeToArduino, 10000, 'GET_INFO\n');
});

parser.on('data', data =>{
    console.log('from arduino:', data);
    var sendmess = "";
    if(data.indexOf("Temperature : ") != -1){
        var Temp = parseFloat(data.substr(14).slice(0,-2));
        sendmess += "温度 : "+ Temp +" [℃]";
    }else if(data.indexOf("Humidity : ") != -1){
        var Humid = parseFloat(data.substr(11).slice(0,-2));
        sendmess += "湿度 : "+ Humid +" [%]";
    }else if(data.indexOf("Brightness : ") != -1){
        var Bright = Number(data.substr(13).slice(0,-1));
        if(Bright <= 700){
            sendmess += "部屋はとても明るいです。";
        }else if(Bright <= 800){
            sendmess += "部屋は明るいです。";
        }else if(Bright <= 850){
            sendmess += "部屋は少し明るいです。";
        }else if(Bright <= 900){
            sendmess += "部屋は少し暗いです。";
        }else if(Bright <= 950){
            sendmess += "部屋は暗いです。";
        }else if(Bright <= 1024){
            sendmess += "部屋はとても暗いです。";
        }
        sendmess += " (RawData : " + Bright + ")";
        _display = false;
    }
    if(_display_info){
        if(sendmess != ""){
            client.channels.cache.get(COM_RECEIVE_CHANNEL_ID).send(sendmess);
        }
        if(!_display){
            _display_info = false;
        }
    }
});

function writeToArduino(data) {
    console.log('Write: ' + data);
    port.write(data, function(err, results) {
      if(err) {
        console.log('Err: ' + err);
        console.log('Results: ' + results);
      }
    });
}

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
//Webcam.capture( "test_picture", function( err, data ) {} );

client.login(token);

client.on("ready", ()=> {
    console.log("起動完了....");
});

client.on("message",async message => {
    var receivemessage = message.content.replace(/　/g," ").split(' ');
    var channelname = message.channel.name;
    var receivecommand = receivemessage[0];
    var argument_2 = receivemessage[1];
    var argument_3 = receivemessage[2];
    var argument_4 = receivemessage[3];
    var send_command = "";
    var _set_timer = false;
    var set_time = 0;

    if(!message.author.bot){
        console.log("-------------------------------------");
        console.log(receivemessage);
        console.log(message.author.username+" (id : "+message.id+")");
    }

    switch(receivecommand){
        case COMMAND_PREFIX+"ip":
            var getURL = "https://checkip.amazonaws.com";
            fetch(getURL)
                .then(res => res.text())
                .then((text) => {
                    console.log(text);
                    client.channels.cache.get(COM_RECEIVE_CHANNEL_ID).send("現在のIPは\n\n"+ text +"\n(誰にもみせないでね)");
                })
                .catch(err => console.log(err));
            break;
        case COMMAND_PREFIX+"get":
            if(argument_2 == null){
                message.reply("Usage:  /get [Command]");
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
                        const canvas = Canvas.createCanvas(1920, 1080);
                        const ctx = canvas.getContext('2d');
                        const background = await Canvas.loadImage('./picture.jpg');
                        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
                        const attachment = new MessageAttachment(canvas.toBuffer(), 'picture.jpg');
                        client.channels.cache.get(COM_RECEIVE_CHANNEL_ID).send(attachment);
                    } );
                    break;
                default:
                    message.reply("そのようなコマンドはありません");
                    break;
            }
            break;
        case COMMAND_PREFIX+"set":
        case COMMAND_PREFIX+"send":
            if(receivecommand == (COMMAND_PREFIX+"set")){
                if(argument_2 == null || argument_3 == null || argument_4 == null){
                    message.reply("Usage:  /set [Target] [Command] [Time(m)]");
                    break;
                }
                set_time = Number(argument_4);
                if(set_time > 0 && set_time <= 600){
                    _set_timer = true;
                    set_time = set_time * 60*1000;
                }else{
                    message.reply("Timerの指定時間は0～600分以内です");
                }
            }else if(receivecommand == (COMMAND_PREFIX+"send")){
                if(argument_2 == null || argument_3 == null){
                    message.reply("Usage:  /send [Target] [Command]");
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
                            message.reply("そのようなコマンドはありません");
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
                            message.reply("そのようなコマンドはありません");
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
                            message.reply("そのようなコマンドはありません");
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
                            message.reply("そのようなコマンドはありません");
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
                                message.reply("Usage:  /send Webcam Target [degree]");
                                break;
                            }
                            var degree =  Number(argument_4);
                            if(degree >= 0 && degree <= 180){
                                send_command = "SERVO_TARGET_" + degree + "\n";
                            }else{
                                message.reply("WebCamの指定角度は0～180度以内です");
                            }
                            break;
                        default:
                            message.reply("そのようなコマンドはありません");
                            break;
                    }
                    break;
                default:
                    message.reply("そのようなデバイスはありません");
                    break;
            }
            break;
        default:
            break;
    }
    if(send_command != ""){
        if(_set_timer){
            setTimeout(writeToArduino, set_time, send_command);
            message.reply("予約完了\n" + (set_time/60000)+ "分後, "+ argument_2 + ", "+ argument_3);
        }else{
            writeToArduino(send_command);
        }
    }

    if(!message.author.bot){
        console.log("-------------------------------------");
    }
});