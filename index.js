const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Anthropic = require('@anthropic-ai/sdk');
const readline = require("readline").createInterface({input: process.stdin, output: process.stdout});
const {app, BrowserWindow, ipcMain} = require('electron')
const {join} = require("node:path");
const {GoogleAIFileManager} = require("@google/generative-ai/server");
const {GoogleGenerativeAI, SchemaType} = require("@google/generative-ai");

let url = ""
let username = ""
let password = ""

let ai = ""
let aiApiKey = ""

puppeteer.use(StealthPlugin())

/**
 * @type {Electron.CrossProcessExports.BrowserWindow}
 */
let win = null

// puppeteer usage as normal
puppeteer.launch({headless: true}).then(async browser => {

    const page = await browser.newPage()
    await page.setViewport({
        width: 1024,
        height: 1024,
        deviceScaleFactor: 1,
    });

    if(!process.argv.includes("--nogui")){
        await app.whenReady()
        win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: join(__dirname, 'preload.js')
            }
        })
        win.removeMenu()
        win.resizable = false;
        await win.loadFile("index.html")

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') app.quit()
        })

        ipcMain.on("url", (event, arg) => {
            url = arg
        })

        ipcMain.on("login", (event, arg) => {
            username = arg[0]
            password = arg[1]
        })

        ipcMain.on("ai-key", (event, arg) => {
            ai = arg[0]
            aiApiKey = arg[1]
        })
    }

    send("status", "Waiting for login page to load")

    // Go to the Sign-in page
    await page.goto('https://www.ixl.com/signin')
    await page.waitForSelector("button")

    await sleep(2000)


    while (!username || !password) {
        send("login")
        await sleep(100)
    }
    send("login-result", true)

    while (!ai || !aiApiKey) {
        await sleep(100)
        send("ai-request")
    }
    send("ai-result", true)


    send("status", "Logging in")


    // type in username and password
    await page.keyboard.type(username)
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await sleep(500)
    await page.keyboard.type(password)

    // click on "Sign in"
    await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button'))
            .find(el => el.textContent.includes('Sign in'));
        if (button) {
            button.click()
        }
    });

    await sleep(2500)

    let doSolve = true

    // Loop for the skill
    while (doSolve) {
        send("status", "ready")
        // check if url is valid
        while (!url) {
            send("url-request",true)
            await sleep(100)
        }
        send("url-request",false)
        // Go to url
        await page.goto(url)
        // Check if url is valid
        await page.waitForSelector(".question-component", {timeout: 10000}).catch(() => {
            url = ""
            send("url-request",true)
        })

        await sleep(2500)

        // Start solving
        await answerQuestions(page)
    }

    // Close browser
    await browser.close()
})

/**
 * @param {import('puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function answerQuestions(page) {

    let doAnswer = true

    while (doAnswer) {

        await page.evaluate(() => document.body.style.zoom = 2  );

        // get the question element
        const question = await page.$(".question-component")

        // check if it exists
        if (!question) {
            doAnswer = false
            url = ""
            send("question-status", "Question not found")
            return
        }

        // get the smartscore (IDK why)
        const smartscoreElement = await page.$(".current-smartscore")
        let smartscore = -1
        if (smartscoreElement) {
            smartscore = await page.evaluate(el => el.textContent, smartscoreElement);
        }

        // get the questions answered (IDK why)
        const questionsCountElement = await page.$(".statistic-content")
        let questionsCount = -1
        if (questionsCountElement) {
            questionsCount = await page.evaluate(el => el.textContent, questionsCountElement);

        }

        // Screenshot the question
        let image = await question.screenshot({encoding: 'base64'})
        await question.screenshot({path: 'screenshot.png', type: 'png'})
        let fullscreenImage = await page.screenshot({encoding: 'base64'})

        send("solve-info", {
            smartscore: smartscore,
            image: fullscreenImage,
            qcount: questionsCount
        })

        send("question-status", "Waiting for AI response")


        // Ask the AI
        let keys = await promptAI(image)
        send("question-status", "AI response received")

        // Loop through all the keys
        let previousKey = null
        for (const key of keys) {
            // Type in text
            if (key.type === "text") {
                await page.keyboard.type(key.content)
            }

            // Press a specific key
            if (key.type === "key") {

                if (key.content.toLowerCase() === "tab") {
                    if (previousKey && previousKey.type === "click") {
                        continue // Prevent tab after click
                    }
                }

                await page.keyboard.press(key.content)
            }

            // Click an element with text (buggy)
            if (key.type === "click") {
                // Get the pixel position of the element to click
                const position = await page.evaluate((text) => {
                    // This is all the elements that are usually stuff to click
                    const gms = document.querySelectorAll(".GeneticallyModified");

                    // loop through all the elements
                    for (let i = 0; i < gms.length; i++) {
                        const gm = gms[i];
                        let finalText = ""

                        // The elements have children that are the split text
                        // so we need to loop through them
                        for (let j = 0; j < gm.children.length; j++) {
                            const child = gm.children[j];
                            finalText += child.innerText
                        }

                        // Check if the text is in the element
                        if (finalText.includes(text)) {
                            const rect = gm.getBoundingClientRect();
                            return Promise.resolve({x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});
                        }
                    }
                }, key.content);

                // Check if the element was found
                if (!position) {
                    send("question-status", "Failed to answer question")
                    continue
                }

                // Click the element
                await page.mouse.move(position.x, position.y)
                await page.mouse.click(position.x, position.y)
            }

            // Wait a bit
            await sleep(100)
            previousKey = key
        }

        send("question-status", "Answered question. Sleeping...")
        await sleep(5000)

        // check if answer is correct
        const textExists = await page.evaluate((text) => {
            return document.body.innerText.includes(text);
        }, 'Sorry, incorrect...'); // Replace with the text you are looking for

        if (textExists) {
            send("question-status", "Answer is incorrect.")
            await sleep(2500)

            // Click the button to continue
            await page.evaluate(() => {
                const button = Array.from(document.querySelectorAll('button'))
                    .find(el => el.textContent.includes('Got it'));
                if (button) {
                    button.click()
                }
            });

            send("question-result", false)

            await sleep(2500)
        } else {
            send("question-status", "Answer is correct.")
            send("question-result", true)
        }

    }

}

// Sleep
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const system = `You are going to be given a screenshot of an IXL math problem. You have to give a response in json like this: {"keys":[{"type:"text","content":"0"},{"type":"click", "content":"Text that is inside the element you want to click"} {"type:"key","content":"Enter"}]} This is the keys the puppeteer will have to press to enter the answer.  Use the Enter key to submit your answer, do not click the submit button, use the Enter key. Use Tab to navigate to other text inputs, DO NOT USE TAB AFTER CLICK, YOU DONT NEED TO. Also you should use the tab key to navigate. Do not write anything else, except the json. Your answer will be directly parsed into a json object.`

/**
 * Prompts the selected AI with the image of the question. Also parses the json response.
 * @param {String} image
 * @returns {Promise<null>}
 */
async function promptAI(image) {

    let keys = null

    switch (ai) {
        case "claude":

            const anthropic = new Anthropic({apiKey: aiApiKey});

            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 1000,
                temperature: 0,
                system: system,
                messages: [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Solve this."
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image
                                }
                            }
                        ]
                    }]
            })

            keys = JSON.parse(msg.content[0].text).keys
            break
        case "gemini":
            const fileManager = new GoogleAIFileManager(aiApiKey);
            const uploadResult = await fileManager.uploadFile("./screenshot.png", {
                mimeType: "image/png",
                displayName: "Question"
            });

            const schema = {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        type: {
                            type: SchemaType.STRING,
                            enum: ["text", "click", "key"]
                        },
                        content: {
                            type: SchemaType.STRING

                        }
                    },
                    required: ["type", "content"]
                }
            }

            const genAI = new GoogleGenerativeAI(aiApiKey)
            const model = genAI.getGenerativeModel({model: "gemini-1.5-pro", generationConfig:{
                temperature: 0,
                top_p: 0.95,
                top_k: 40,
                max_output_tokens: 8192,
                response_mime_type: "application/json",
                responseSchema: schema
              }, systemInstruction: system})


            const result = await model.generateContent([
                "Solve this.",
                {
                    fileData: {
                        fileUri: uploadResult.file.uri,
                        mimeType: uploadResult.file.mimeType
                    }
                }
            ])

            keys = JSON.parse(result.response.text())
    }

    return keys
}

let urlPrompt = false

/**
 * Sends a message to electron renderer window, or handles it through console if nogui is true
 * @param {string} channel
 * @param {any} args
 */
function send(channel, ...args) {
    if (win) {
        win.webContents.send(channel, ...args)
    }
    else{
        switch (channel) {
            case "status":
                console.log(...args)
                break
            case "solve-info":
                console.log("Smartscore: " + args[0].smartscore + " Questions answered: " + args[0].qcount)
            case "login":
                username = process.env.IXL_USERNAME
                password = process.env.IXL_PASSWORD
                break
            case "ai-request":
                ai = process.env.AI_TYPE
                aiApiKey = process.env.API_KEY
                break
            case "url-request":
                if(!urlPrompt) {
                    urlPrompt = true

                    readline.question("Enter url: ", (input) => {
                        url = input.trim()
                        urlPrompt = false
                    })
                }
                break
            default:
                console.log(channel + ": ", ...args)
        }
    }
}
