chat_history = []

document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");

    let message_count = 0

    sendBtn.addEventListener("click", function () {
        const question = userInput.value.trim();

        if (question !== "") {

            message_count += 1;

            const userMessage = document.createElement("div");
            userMessage.className = "message-box user";

            const userContainer = document.createElement("div");
            userContainer.className = "user";

            const profilePic = document.createElement("div");
            profilePic.className = "profile-pic";

            const messageContent = document.createElement("div");
            messageContent.className = "message";
            messageContent.textContent = question;

            userContainer.appendChild(messageContent);
            userContainer.appendChild(profilePic);
            userMessage.appendChild(userContainer);

            const botMessage = `
                <div class="message-box bot">
                    <div class="bot">
                        <div class="profile-pic"></div>
                        <div class="message" id="botmessage${message_count}">
                            <div class="loading"></div>
                        </div>
                    </div>

                    <div class="sources" id="botsources${message_count}"></div>
                </div>
            `;

            chatBox.appendChild(userMessage);
            chatBox.innerHTML += botMessage;

            userInput.value = "";
            userInput.style.height = "45px";

            ask_gouvx(question, message_count);

        }
    });

    userInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            sendBtn.click();
        }
    });
});

function adjustRows(textarea) {
    textarea.style.height = "45px";
    textarea.style.height = (25 + textarea.scrollHeight) + "px"
}


function parse_response_metadata(metadata, message_number) {
    [metada_json, other_text] = metadata.split("\n")

    if (metada_json == null){
        return other_text
    }

    const jsonData = JSON.parse(metada_json);

    let lastbotsources = document.getElementById("botsources" + message_number);

    const result = jsonData.map((item, index) => {
        const { title, url } = item;
        return `<a href="${url}" target="_blank">[${index + 1}] ${title}</a>`;
    });

    sources = result.join('<br>');

    lastbotsources.innerHTML = sources

    return other_text
}


function ask_gouvx(question, message_number) {
    const url = 'https://gouvx-api-g26csh5qkq-ew.a.run.app/ask/';
    const postData = new URLSearchParams({
        q: question,
        h: JSON.stringify(chat_history)
    });

    const loader = document.querySelector('.loading')
    loader.classList.add('display')

    fetch(url, {
        method: 'POST',
        body: postData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => {
            const reader = response.body.getReader();
            const textDecoder = new TextDecoder();

            let system_reply = ""

            return new ReadableStream({
                async start(controller) {

                    const { done, value } = await reader.read();
                    let metadata = textDecoder.decode(value, { stream: true });
                    remaining_reply = parse_response_metadata(metadata, message_number)

                    //TODO make this a function
                    if (remaining_reply) {                        
                        let lastbotmessage = document.getElementById("botmessage" + message_number);
                        lastbotmessage.innerHTML += remaining_reply
                    }

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            controller.close();
                            break;
                        }

                        // Convert the chunk to a string and print it
                        let chunkText = textDecoder.decode(value, { stream: true });
                        system_reply += chunkText
                        chunkTextHTML = chunkText.replace("\n", "<br><br>")

                        let lastbotmessage = document.getElementById("botmessage" + message_number);
                        lastbotmessage.innerHTML += chunkTextHTML

                        controller.enqueue(value);
                    }
            
                    chat_history.push({
                        "role": "user",
                        "content": question
                    })
        
                    chat_history.push({
                        "role": "system",
                        "content": system_reply
                    })
                }
            });
        })
        .then(() => loader.remove())
        .then(stream => new Response(stream))
        .then(response => response.text())
        .then(data => {
            return data
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
