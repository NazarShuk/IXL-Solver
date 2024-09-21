import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import Anthropic from '@anthropic-ai/sdk';
import * as readLineSync from 'readline-sync';

const anthropic = new Anthropic();

puppeteer.use(StealthPlugin())


// puppeteer usage as normal
puppeteer.launch({ headless: false}).then(async browser => {
  const page = await browser.newPage()
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  await page.goto('https://www.ixl.com/signin')
  await page.waitForSelector("button")

  await sleep(2000)

  await page.keyboard.type(process.env.IXL_USERNAME)
  await page.keyboard.press("Tab")
  await page.keyboard.press("Tab")
  await sleep(500)
  await page.keyboard.type(process.env.IXL_PASSWORD)

  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button'))
                        .find(el => el.textContent.includes('Sign in'));
    if (button) {
      console.log("found btn")
      button.click()
    }
  });

  await sleep(2500)

  let doSolve = true

  while (doSolve){
    let url = readLineSync.question("Enter url: ")

    await page.goto(url)
    await page.waitForSelector(".question-component", {timeout: 10000}).catch(()=>{
      console.log("Couldn't find question")
      doSolve = false
    })

    await sleep(2500)

    await answerQuestions(page)
  }

  await browser.close()
})

async function answerQuestions(page){

  let doAnswer = true

  while (doAnswer) {

    const question = await page.$(".question-component")

    if(!question){
      console.log("Question not found")
      doAnswer = false
      return
    }

    const smartscoreElement = await page.$(".current-smartscore")
    if (smartscoreElement) {
      const smartscore = await page.evaluate(el => el.textContent, smartscoreElement);
      console.log("smartscore: ", smartscore)

    }
    const questionsCountElement = await page.$(".statistic-content")
    if (questionsCountElement) {
      const smartscore = await page.evaluate(el => el.textContent, questionsCountElement);
      console.log("questions answered: ", smartscore)

    }

    let image = await question.screenshot({encoding: 'base64'})
    await question.screenshot({path:"question.png"})

    console.log("Got the image, sending to claude ai")

    let didGetAnswer = false

    let aiAnswerTimeout = setTimeout(async ()=>{
      if(!didGetAnswer){
        console.log("Ai took too long to respond, trying again.")
        doAnswer = false
        await answerQuestions(page)
      }
    },10000)

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0,
      system: `You are going to be given a screenshot of an IXL math problem. You have to give a response in json like this: {"keys":[{"type:"text","content":"0"},{"type":"click":"Text that is inside the element you want to click"} {"type:"key","content":"Enter"}]} This is the keys the puppeteer will have to press to enter the answer.  Use the Enter key to submit your answer, do not click the submit button, use the Enter key. Use Tab to navigate to other text inputs, DO NOT USE TAB AFTER CLICK, YOU DONT NEED TO. Do not write anything else, except the json. Your answer will be directly parsed into a json object.`,
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

    didGetAnswer = true
    clearTimeout(aiAnswerTimeout)
    //let answer = JSON.parse(msg.content[0].text).final
    let keys = JSON.parse(msg.content[0].text).keys

    console.log("Keys: ", keys)

    let previousKey = null
    for (const key of keys) {
      if (key.type === "text") {
        await page.keyboard.type(key.content)
      }

      if (key.type === "key") {

        if(key.content.toLowerCase() === "tab"){
          if(previousKey && previousKey.type === "click"){
            continue // Prevent tab after click
          }
        }

        await page.keyboard.press(key.content)
      }

      if (key.type === "click") {
        const position = await page.evaluate((text) => {
          const gms = document.querySelectorAll(".GeneticallyModified");

          for (let i = 0; i < gms.length; i++) {
            const gm = gms[i];
            let finalText = ""

            for (let j = 0; j < gm.children.length; j++) {
              const child = gm.children[j];


              finalText += child.innerText
            }

            if (finalText.includes(text)) {
              const rect = gm.getBoundingClientRect();
              return Promise.resolve({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
            }
          }
        }, key.content);

        if (!position) {
          console.log("Position not found")
          continue
        }
        console.log("Position: ", position)

        await page.mouse.move(position.x, position.y)
        await page.mouse.click(position.x, position.y)
      }

      await sleep(100)
      previousKey = key
    }

    console.log("Answered question. Sleeping...")
    await sleep(5000)

    // check if answer is correct

    const textExists = await page.evaluate((text) => {
      return document.body.innerText.includes(text);
    }, 'Sorry, incorrect...'); // Replace with the text you are looking for

    if (textExists) {
      console.log("Answer is incorrect. Skipping...")
      await sleep(2500)

      await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button'))
            .find(el => el.textContent.includes('Got it'));
        if (button) {
          console.log("found btn")
          button.click()
        }
      });

      await sleep(2500)
    } else {
      console.log("Answer is correct. Continuing...")
    }

  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

