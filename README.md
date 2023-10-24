# RemoteControl
Discordを介して外部から部屋の電気やエアコンなどの操作をすることができます。
操作はArduinoに搭載した赤外線LEDによって行われます。

以下動作例

https://github.com/UnknownSP/RemoteControl/assets/39638661/d6234df4-dac1-4872-a727-7dc76ab2affc

## 仕様

操作できる機器と内容は以下の通りです。

- TV
  - 起動及び停止
- 部屋の電気
  - ON
  - OFF
- エアコン
  - 停止
  - 暖房
  - 冷房
  - 除湿
- ダイソン扇風機
  - 起動及び停止
  - 冷風
  - 暖房温度+
  - 暖房温度-
  - 風量+
  - 風量-
- カメラ
  - 指定位置に回転
  - 画像を撮影してDiscordに送信
- 部屋の情報取得
  - 温度
  - 湿度
  - 明るさ
