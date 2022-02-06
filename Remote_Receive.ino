#define INPUT_PIN 2
#define OUTPUT_PIN 3

void setup() {
  pinMode(INPUT_PIN,INPUT);
  pinMode(OUTPUT_PIN,OUTPUT);
  Serial.begin(115200);
  Serial.println("start");
}

bool first_flag = true;
unsigned long now_time = 0;
unsigned long start_time = 0;
unsigned long recent_time = 0;
bool now_signal = false;
bool break_flag = false;

void loop() {

  if(now_signal){
    while(digitalRead(INPUT_PIN)==LOW);
    now_signal = false;
  }else{
    while(digitalRead(INPUT_PIN)==HIGH){
      if(micros()-recent_time >= 5000000 && !break_flag){
        Serial.println(",");
        break_flag = true;
      }
    }
    break_flag = false;
    now_signal = true;
  }

  now_time = micros();
  Serial.print(now_time - recent_time);
  Serial.print(",");
  recent_time = now_time;
  
  
}
