f = open('time.txt', 'r')
data = f.read()
splitdata = data.split(",")
for i in range(len(splitdata)):
    splitdata[i] = splitdata[i].replace("\n","")

splitdata_num = [int(num) for num in splitdata]

for i in range(len(splitdata_num)):
    if splitdata_num[i] >= 200 and splitdata_num[i] < 600:
        splitdata_num[i] = 1
    elif splitdata_num[i] >= 600 and splitdata_num[i] < 1000:
        splitdata_num[i] = 2
    elif splitdata_num[i] >= 1000 and splitdata_num[i] < 1400:
        splitdata_num[i] = 3

print(splitdata_num)
print(len(splitdata_num))
count = 0
printdata = "0b"
for i in range(len(splitdata_num)):
    count += 1
    if splitdata_num[i] == 1:
        printdata += "0"
    elif splitdata_num[i] == 3:
        printdata += "1"
    if count == 32:
        count = 0
        print(printdata+",")
        printdata = "0b"
print(printdata)

