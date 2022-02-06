#include <Servo.h>
#include <DHT.h>
#include "digitalWriteFast.h"

#define STATE_LED 11
#define SEND_PIN 3
#define PHOTO_R_PIN A0
#define WEBCAM_POWER_PIN 7
#define WEBCAM_SERVO_PIN 9 
#define DHT11_DATA 8  //温湿度センサのデータ出力ピン

#define IR_SEND_DUTY_CYCLE 30
#define CLOCKS_PER_MICRO (F_CPU / 1000000L)

Servo WebCam_servo;
DHT dht11(DHT11_DATA,DHT11);

unsigned int periodTime = 0;
unsigned int periodOnTime = 0;
int recieveByte = 0;
String bufferStr = "";
const String TV_Power = "TV_POWER";
const String Light_On = "LIGHT_ON";
const String Light_Off = "LIGHT_OFF";
const String AC_Stop = "AC_STOP";
const String AC_Heat = "AC_HEAT";
const String AC_Cool = "AC_COOL";
const String AC_DeHumid = "AC_DEHUMID";
const String DS_Power = "DS_POWER";
const String DS_Cool = "DS_COOL";
const String DS_HeatP = "DS_HEAT_PLUS";
const String DS_HeatM = "DS_HEAT_MINUS";
const String DS_AirP = "DS_AIR_PLUS";
const String DS_AirM = "DS_AIR_MINUS";
const String Servo_Right = "SERVO_R";
const String Servo_Left = "SERVO_L";
const String Servo_Target = "SERVO_TARGET_";
const String Get_Info = "GET_INFO";
int servo_pos = 0; 

void setup() {
  // put your setup code here, to run once:
  pinModeFast(STATE_LED,OUTPUT);
  pinModeFast(SEND_PIN,OUTPUT);
  pinModeFast(WEBCAM_POWER_PIN,OUTPUT);
  WebCam_servo.attach(WEBCAM_SERVO_PIN);
  dht11.begin();
  Serial.begin(115200);
}

const uint32_t irSignal_AC_Heat[] = {
  0b01000000000000000000000001000000,
  0b00000000000000000000000000000100,
  0b01010101010100010101010101010101,
  0b00000000000000000000010100000101,
  0b01010000010100000001000001000001,
  0b01000101000101000101000001000000,
  0b00000101000101010000010001010100,
  0b01010001000000010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010001010000010000,
  0b01000001010001010100000001010101,
  0b00010101000000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000001,
  0b01010101010101000101000000000000,
  0b00000101010101010100000000000000,
  0b00010101010101010000000100000101,
  0b01010100010100000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
};

const uint32_t irSignal_AC_Cool[] = {
  0b01000000000000000000000001000000,
  0b00000000000000000000000000000100,
  0b01010101010100010101010101010101,
  0b00000000000000000000010100000101,
  0b01010000010100000001000001000001,
  0b01000101000101000101000001000000,
  0b00000101000101010000010100010100,
  0b01010000010000010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010101000001000100,
  0b00000101000100010100000001010101,
  0b00010101000000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000001,
  0b01010101010101000101000000000000,
  0b00000101010101010100000000000000,
  0b00010101010101010000000100000101,
  0b01010100010100000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
};

const uint32_t irSignal_AC_DeHumid[] = {
  0b01000000000000000000000001000000,0b00000000000000000000000000000100,0b01010101010100010101010101010101,
  0b00000000000000000000010100000101,0b01010000010100000001000001010001,0b01000101000001000001010000010000,
  0b01000001010001010000010000000000,0b01010001010101010000000000000000,0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,0b01010101010101010000000000000000,0b01010101010101010000000000000000,
  0b01010101010101010100000101000100,0b00010100000100010100000101010101,0b00010100000000000001000000000000,
  0b01000101010101010000000000000000,0b01010101010101010000000000000001,0b01010101010101000101000001010100,
  0b00000101000000010100000000000000,0b00010101010101010000000100000101,0b01010100010100000000000000000000,
  0b01010101010101010000000000000000,0b01010101010101010101010101010101,0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,0b00000000000000000101010101010101,0b00000000000000000000000000000000,
  0b01010101010101010000000000000000,0b01010101010101010000000000000000,0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
};
const uint32_t irSignal_AC_Stop[] = {
  0b01000000000000000000000001000000,
  0b00000000000000000000000000000100,
  0b01010101010100010101010101010101,
  0b00000000000000000000010100000101,
  0b01010000010100000001000001000001,
  0b01000101000101000101000001000000,
  0b00000101000101010000010001010100,
  0b01010001000000010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010001010000010000,
  0b01000001010001010100000000010101,
  0b00010101010000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000001,
  0b01010101010101000101000000000000,
  0b00000101010101010100000000000000,
  0b00010101010101010000000100000101,
  0b01010100010100000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000101010101010101,
  0b00000000000000000000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
  0b01010101010101010000000000000000,
};

const uint8_t irSignal_TV_Power[] PROGMEM = { //TV POWER
  8, 4, 1, 1, 1, 3, 1, 1, 1, 3, 1,
  1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 
  1, 1, 1, 3, 1, 3, 1, 1, 1, 3, 1, 1, 
  1, 3, 1, 3, 1, 3, 1, 3, 1, 1, 1, 1, 
  1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 1, 
  1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 
  1, 3, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 
  1, 3, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 
  1, 3, 1, 3, 1
};

const uint8_t irSignal_Light_On[] PROGMEM = { //Light ON
  1,2,1,1,1,1,1,1,1,1,1,1,1,
  2,1,2,1,1,1,1,1,1,1,1,1,2,
  1,1,1,1,1,1,1,1,1,1,1,16,1,
  2,1,1,1,1,1,1,1,1,1,1,1,2,
  1,2,1,1,1,1,1,1,1,1,1,2,1,
  1,1,1,1,1,1,1,1,1,1,16,1,2,
  1,1,1,1,1,1,1,1,1,1,1,2,1,
  2,1,1,1,1,1,1,1,1,1,2,1,1,
  1,1,1,1,1,1,1,1,1,16,1,2,1,
  1,1,1,1,1,1,1,1,1,1,2,1,1,
  1,1,1,1,1,1,1,1,1,2,1,1,1,
  1,1,1,1,1,1,1,1
};

const uint8_t irSignal_Light_Off[] PROGMEM = { //Light OFF
  1,2,1,1,1,1,1,1,1,1,1,1,1,
  2,1,2,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,1,2,1,1,1,1,1,16,1,
  2,1,1,1,1,1,1,1,1,1,1,1,2,
  1,2,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,1,2,1,1,1,1,1,16,1,2,
  1,1,1,1,1,1,1,1,1,1,1,2,1,
  2,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,1,2,1,1,1,1,1,16,1,2,1,
  1,1,1,1,1,1,1,1,1,1,2,1,2,
  1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,1,2,1,1,1,1,1,
};

const uint8_t irSignal_DS_Power[] PROGMEM = { //dengen
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1
};
const uint8_t irSignal_DS_Cool[] PROGMEM = { //reibou
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2,
  1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2,
  1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 
  1, 1, 1, 1, 1, 1, 1, 2, 1
};
const uint8_t irSignal_DS_HeatP[] PROGMEM = { //danbou +
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 
  1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 
  1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 
  1, 1, 1, 1, 1, 1, 1, 2, 1
}; 
const uint8_t irSignal_DS_HeatM[] PROGMEM = { //danbou -
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 
  1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 
  1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 
  1, 2, 1, 2, 1, 2, 1, 2, 1
}; 
const uint8_t irSignal_DS_AirP[] PROGMEM = { //huuryou +
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 
  1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 
  1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 
  1, 2, 1, 2, 1, 2, 1, 2, 1
};
const uint8_t irSignal_DS_AirM[] PROGMEM = { //huuryou -
  3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 
  1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 
  1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 
  1, 2, 1, 1, 1, 2, 1, 2, 1
};

void loop() {

  digitalWrite(STATE_LED,LOW);
  bufferStr = "";
  while (Serial.available() > 0) {
    bufferStr = Serial.readStringUntil('\n');
  }

  if (bufferStr.length() > 0) {
    digitalWrite(STATE_LED,HIGH);
    Serial.print("Received : "); 
    Serial.println(bufferStr);
    if (TV_Power.compareTo(bufferStr) == 0) {
      sendRawData_8bit(irSignal_TV_Power, sizeof(irSignal_TV_Power) / sizeof(irSignal_TV_Power[0]), 38, 400);
    }else if(Light_On.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_Light_On, sizeof(irSignal_Light_On) / sizeof(irSignal_Light_On[0]), 38, 500);
    }else if(Light_Off.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_Light_Off, sizeof(irSignal_Light_Off) / sizeof(irSignal_Light_Off[0]), 38, 500);
    }else if(AC_Stop.compareTo(bufferStr) == 0){
      sendRawData_32bit(irSignal_AC_Stop, sizeof(irSignal_AC_Stop) / sizeof(irSignal_AC_Stop[0]), 38, 400, 977);
    }else if(AC_Cool.compareTo(bufferStr) == 0){
      sendRawData_32bit(irSignal_AC_Cool, sizeof(irSignal_AC_Cool) / sizeof(irSignal_AC_Cool[0]), 38, 400, 977);
    }else if(AC_Heat.compareTo(bufferStr) == 0){
      sendRawData_32bit(irSignal_AC_Heat, sizeof(irSignal_AC_Heat) / sizeof(irSignal_AC_Heat[0]), 38, 400, 977);
    }else if(AC_DeHumid.compareTo(bufferStr) == 0){
      sendRawData_32bit(irSignal_AC_DeHumid, sizeof(irSignal_AC_DeHumid) / sizeof(irSignal_AC_DeHumid[0]), 38, 400, 977);
    }else if(DS_Power.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_Power, sizeof(irSignal_DS_Power) / sizeof(irSignal_DS_Power[0]), 38, 700);
    }else if(DS_Cool.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_Cool, sizeof(irSignal_DS_Cool) / sizeof(irSignal_DS_Cool[0]), 38, 700);
    }else if(DS_HeatP.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_HeatP, sizeof(irSignal_DS_HeatP) / sizeof(irSignal_DS_HeatP[0]), 38, 700);
    }else if(DS_HeatM.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_HeatM, sizeof(irSignal_DS_HeatM) / sizeof(irSignal_DS_HeatM[0]), 38, 700);
    }else if(DS_AirP.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_AirP, sizeof(irSignal_DS_AirP) / sizeof(irSignal_DS_AirP[0]), 38, 700);
    }else if(DS_AirM.compareTo(bufferStr) == 0){
      sendRawData_8bit(irSignal_DS_AirM, sizeof(irSignal_DS_AirM) / sizeof(irSignal_DS_AirM[0]), 38, 700);
    }else if(Servo_Right.compareTo(bufferStr) == 0){
      digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
      delay(500);
      WebCam_servo.write(0);
      delay(500);
      digitalWriteFast(WEBCAM_POWER_PIN, LOW);
    }else if(Servo_Left.compareTo(bufferStr) == 0){
      digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
      delay(500);
      WebCam_servo.write(180);
      delay(500);
      digitalWriteFast(WEBCAM_POWER_PIN, LOW);
    }else if(bufferStr.indexOf(Servo_Target) != -1){
      bufferStr.remove(0,13);
      uint8_t degree =  bufferStr.toInt();
      if(degree >= 0 && degree <= 180){
        digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
        delay(500);
        WebCam_servo.write(degree);
        delay(500);
        digitalWriteFast(WEBCAM_POWER_PIN, LOW);
      }
    }else if(Get_Info.compareTo(bufferStr) == 0){
      Serial.print("Temperature : ");
      Serial.println(dht11.readTemperature());
      Serial.print("Humidity : ");
      Serial.println(dht11.readHumidity());
      Serial.print("Brightness : ");
      Serial.println(analogRead(PHOTO_R_PIN));
    }
    delay(500);
  }
  /*
  delay(1000);
  Serial.println(dht11.readTemperature());
  Serial.println(dht11.readHumidity());
  Serial.println(analogRead(PHOTO_R_PIN));
  digitalWrite(STATE_LED,HIGH);
  delay(1000);
  digitalWrite(STATE_LED,LOW);
  */
  
  //sendRawData_16bit(irSignal_Light_On, sizeof(irSignal_Light_On) / sizeof(irSignal_Light_On[0]), 38);
  //delay(5000);
  //sendRawData_16bit(irSignal_Light_Off, sizeof(irSignal_Light_Off) / sizeof(irSignal_Light_Off[0]), 38);
  //delay(5000);
  //sendRawData_8bit(irSignal_TV_Power, sizeof(irSignal_TV_Power) / sizeof(irSignal_TV_Power[0]), 38, 400);
  //delay(5000);
  //sendRawData_32bit(irSignal_AC_Heat, sizeof(irSignal_AC_Heat) / sizeof(irSignal_AC_Heat[0]), 38, 400, 977);
  //delay(5000);
  //sendRawData_32bit(irSignal_AC_Cool, sizeof(irSignal_AC_Cool) / sizeof(irSignal_AC_Cool[0]), 38, 400, 977);
  //delay(5000);
  //sendRawData_32bit(irSignal_AC_DeHumid, sizeof(irSignal_AC_DeHumid) / sizeof(irSignal_AC_DeHumid[0]), 38, 400, 977);
  //delay(5000);
  //sendRawData_32bit(irSignal_AC_Stop, sizeof(irSignal_AC_Stop) / sizeof(irSignal_AC_Stop[0]), 38, 400, 977);
  
  
  /*
  sendRawData_8bit(irSignal_DS_Power, sizeof(irSignal_DS_Power) / sizeof(irSignal_DS_Power[0]), 38, 700);
  delay(6000);
  sendRawData_8bit(irSignal_DS_Cool, sizeof(irSignal_DS_Cool) / sizeof(irSignal_DS_Cool[0]), 38, 700);
  delay(6000);
  sendRawData_8bit(irSignal_DS_HeatP, sizeof(irSignal_DS_HeatP) / sizeof(irSignal_DS_HeatP[0]), 38, 700);
  delay(6000);
  sendRawData_8bit(irSignal_DS_HeatM, sizeof(irSignal_DS_HeatM) / sizeof(irSignal_DS_HeatM[0]), 38, 700);
  delay(6000);
  sendRawData_8bit(irSignal_DS_AirP, sizeof(irSignal_DS_AirP) / sizeof(irSignal_DS_AirP[0]), 38, 700);
  delay(6000);
  sendRawData_8bit(irSignal_DS_AirM, sizeof(irSignal_DS_AirM) / sizeof(irSignal_DS_AirM[0]), 38, 700);
  delay(6000);
  */
  //sendRawData_32bit(irSignal_AC_Heat, sizeof(irSignal_AC_Heat) / sizeof(irSignal_AC_Heat[0]), 38, 400, 977);
  //sendRawData_32bit(irSignal_AC_Cool, sizeof(irSignal_AC_Cool) / sizeof(irSignal_AC_Cool[0]), 38, 400, 977);
  /*
  delay(5000);
  digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
  delay(1000);
  WebCam_servo.write(0);
  delay(1000);
  digitalWriteFast(WEBCAM_POWER_PIN, LOW);
  delay(5000);
  digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
  delay(1000);
  WebCam_servo.write(180);
  delay(1000);
  digitalWriteFast(WEBCAM_POWER_PIN, LOW);
  delay(5000);
  digitalWriteFast(WEBCAM_POWER_PIN, HIGH);
  delay(1000);
  WebCam_servo.write(90);
  delay(1000);
  digitalWriteFast(WEBCAM_POWER_PIN, LOW);
  */
  //sendRawData_32bit(irSignal_AC_Stop, sizeof(irSignal_AC_Stop) / sizeof(irSignal_AC_Stop[0]), 38, 400, 977);
}

void DelayMicroseconds(unsigned long Microseconds) {
  unsigned long start = micros() - (64 / clockCyclesPerMicrosecond()); 
  while (micros() - start < Microseconds);
}

void EnableIROut(uint8_t Frequency) {
  periodTime = (1000U + (Frequency / 2)) / Frequency;
  periodOnTime = (((periodTime * IR_SEND_DUTY_CYCLE) + 50) / 100U);
  pinModeFast(SEND_PIN,OUTPUT);
  digitalWriteFast(SEND_PIN, LOW);
}

void space(unsigned int SpaceTime) {
  DelayMicroseconds(SpaceTime);
}

void mark(unsigned int MarkTime) {
  unsigned long startTime = micros();
  unsigned long nextPeriodEnding = startTime;
  unsigned long nowTime;
  do{
    noInterrupts();
    digitalWriteFast(SEND_PIN, HIGH);
    delayMicroseconds(periodOnTime);
    digitalWriteFast(SEND_PIN, LOW);
    interrupts();
    nextPeriodEnding += periodTime;
    do{
      nowTime = micros();
      unsigned int DeltaTime = nowTime - startTime;
      if (DeltaTime >= MarkTime - (112 / CLOCKS_PER_MICRO)) {
        return;
      }
    }while(nowTime < nextPeriodEnding);
  }while(true);
}

/*void sendRawData_16bit(const uint16_t dataBuffer[], uint_fast8_t BufLength, uint_fast8_t Frequency){
  EnableIROut(Frequency);
  for (uint_fast8_t i = 0; i < BufLength; i++) {
    if (i & 1) {
      space(dataBuffer[i]);
    } else {
      mark(dataBuffer[i]);
    }
  }
  digitalWriteFast(SEND_PIN, LOW);
}*/

void sendRawData_8bit(const uint8_t dataBuffer[], uint_fast16_t BufLength, uint_fast8_t Frequency, uint_fast16_t PulseTime){
  EnableIROut(Frequency);
  for (uint_fast16_t i = 0; i < BufLength; i++) {
    if (i & 1) {
      space(pgm_read_byte(&dataBuffer[i]) * PulseTime);
    } else {
      mark(pgm_read_byte(&dataBuffer[i]) * PulseTime);
    }
  }
  digitalWriteFast(SEND_PIN, LOW);
}

void sendRawData_32bit(const uint_fast32_t dataBuffer[], uint_fast16_t BufLength, uint_fast8_t Frequency, uint_fast16_t PulseTime, uint_fast16_t StopLength){
  uint_fast32_t cal_bit = 0b10000000000000000000000000000000;
  uint_fast32_t loop_num = 0;
  EnableIROut(Frequency);
  mark(PulseTime * 75);
  space(PulseTime * 125);
  mark(PulseTime * 8);
  space(PulseTime * 4);
  for (uint_fast8_t i = 0; i < BufLength; i++) {
    for (uint_fast8_t j = 0; j < 32; j++){
      if (dataBuffer[i] & cal_bit){
        if (j & 1) {
          space(PulseTime * 3);
        } else {
          mark(PulseTime * 3);
        }
      }else{
        if (j & 1) {
          space(PulseTime);
        } else {
          mark(PulseTime);
        }
      }
      cal_bit >>= 1;
      loop_num++;
      if(loop_num == StopLength) break;
    }
    cal_bit = 0b10000000000000000000000000000000;
  }
  digitalWriteFast(SEND_PIN, LOW);
}
