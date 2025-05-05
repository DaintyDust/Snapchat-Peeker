document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const settingsForm = document.getElementById('settingsForm');
    const topicInput = document.getElementById('topicInput');
    const statusMessage = document.getElementById('statusMessage');

    // Load saved topic from storage when popup opens
    chrome.storage.sync.get(['notificationTopic'], function(result) {
        if (result.notificationTopic) {
            topicInput.value = result.notificationTopic;
        } else {
            // Default value if not set
            topicInput.value = 'test';
        }
    });

    // Save settings when form is submitted
    settingsForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const topic = topicInput.value.trim();
        
        if (!topic) {
            statusMessage.textContent = 'Please enter a valid topic.';
            statusMessage.style.color = 'red';
            return;
        }
        
        // Save to storage
        chrome.storage.sync.set({
            notificationTopic: topic
        }, function() {
            statusMessage.textContent = 'Settings saved successfully!';
            statusMessage.style.color = 'green';
            
            // Send message to content script to update the topic
            chrome.tabs.query({url: '*://*.snapchat.com/*'}, function(tabs) {
                tabs.forEach(function(tab) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'UPDATE_NOTIFICATION_TOPIC',
                        topic: topic
                    });
                });
            });
            
            // Clear success message after 3 seconds
            setTimeout(function() {
                statusMessage.textContent = '';
            }, 3000);
        });
    });
});
