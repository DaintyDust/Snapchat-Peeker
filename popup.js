document.addEventListener('DOMContentLoaded', function () {
    const settingsForm = document.getElementById('settingsForm');
    const topicInput = document.getElementById('topicInput');
    const excludeInput = document.getElementById('excludeInput');
    const statusMessage = document.getElementById('statusMessage');

    chrome.storage.sync.get(['notificationTopic', 'excludeWords'], function (result) {
        if (result.notificationTopic) {
            topicInput.value = result.notificationTopic;
        } else {
            topicInput.value = 'test';
        }

        if (result.excludeWords) {
            excludeInput.value = result.excludeWords;
        }
    });

    settingsForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const topic = topicInput.value.trim();
        const excludeWords = excludeInput.value.trim();

        if (!topic) {
            statusMessage.textContent = 'Please enter a valid topic.';
            statusMessage.style.color = 'red';
            return;
        }

        chrome.storage.sync.set({
            notificationTopic: topic,
            excludeWords: excludeWords
        }, function () {
            statusMessage.textContent = 'Settings saved successfully!';
            statusMessage.style.color = 'green';

            chrome.tabs.query({ url: '*://*.snapchat.com/*' }, function (tabs) {
                tabs.forEach(function (tab) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'UPDATE_NOTIFICATION_SETTINGS',
                        topic: topic,
                        excludeWords: excludeWords
                    });
                });
            });

            setTimeout(function () {
                statusMessage.textContent = '';
            }, 3000);
        });
    });
});
