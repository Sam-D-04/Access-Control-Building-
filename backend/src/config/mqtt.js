const mqtt = require('mqtt');
require('dotenv').config();

let mqttClient = null;
let isConnected = false;

// khởi tạo kết nối MQTT
function initMqttClient() {
    const brokerUrl = process.env.MQTT_BROKER;

    console.log('Dang ket noi MQTT broker:', brokerUrl);

    // Tạo client ID ngẫu nhiên
    const randomId = Math.random().toString(16).slice(3);
    mqttClient = mqtt.connect(brokerUrl, {
        clientId: `acs-backend-${randomId}`,
        clean: true,
        reconnectPeriod: 5000, 
        connectTimeout: 30 * 1000
    });

    // Kết nối thành công
    mqttClient.on('connect', function() {
        isConnected = true;
        console.log('MQTT ket noi thanh cong');
    });

    // lỗi kết nối
    mqttClient.on('error', function(error) {
        isConnected = false;
 
        if (!mqttClient.reconnecting) {
            console.log('MQTT chua ket noi duoc');
        }
    });

    // Mất kết nối
    mqttClient.on('offline', function() {
        isConnected = false;
    });

    // Đang kết nối lại
    mqttClient.on('reconnect', function() {
        // Không log gì
    });

    return mqttClient;
}

// publish message lên MQTT topic
function publishMessage(topic, messageData) {
    // Kiểm tra client đã khởi tạo chưa
    if (!mqttClient) {
        console.log('MQTT client chua khoi tao, bo qua viec gui message');
        return false;
    }

    // Kiểm tra đã kết nối chưa
    if (!mqttClient.connected) {
        console.log('MQTT chua ket noi, bo qua viec gui message');
        return false;
    }

    // Chuyển object thành JSON string
    let payloadString = messageData;
    if (typeof messageData !== 'string') {
        payloadString = JSON.stringify(messageData);
    }

    // Publish message lên topic
    mqttClient.publish(topic, payloadString, { qos: 1 }, function(error) {
        if (error) {
            console.error(`Lỗi khi gửi MQTT message đến topic ${topic}:`, error.message);
        } else {
            console.log(`Đã gửi MQTT message đến topic: ${topic}`);
        }
    });

    return true;
}

// subscribe topic và xử lý message nhận được
function subscribeToTopic(topic, callbackFunction) {
    // Kiểm tra client
    if (!mqttClient) {
        console.error('MQTT client chua khoi tao');
        return false;
    }

    if (!mqttClient.connected) {
        console.error('MQTT chua ket noi');
        return false;
    }

    // Lắng nghe message từ topic
    mqttClient.on('message', function(receivedTopic, messageBuffer) {
        if (receivedTopic === topic && callbackFunction) {
            try {
                // Thử parse JSON
                const messageString = messageBuffer.toString();
                const parsedData = JSON.parse(messageString);
                callbackFunction(parsedData);
            } catch (error) {
                // Nếu không parse được thì gửi dạng string
                callbackFunction(messageBuffer.toString());
            }
        }
    });

    return true;
}

// đóng kết nối MQTT
function closeMqttConnection() {
    if (mqttClient) {
        mqttClient.end();
        console.log('Đa dong ket noi MQTT');
    }
}
function getMqttClient() {
    return mqttClient;
}

module.exports = {
    initMqttClient,
    publishMessage,
    subscribeToTopic,
    closeMqttConnection,
    getMqttClient
};
