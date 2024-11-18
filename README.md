# IXL Solver
Uses puppeteer to log in to your IXL account, and solve questions using LLMs. Right now, you can use Google's Gemini, or Anthropic's Claude.

## Usage
Clone the repository, and run `npm install`.
You can run the app with, and no GUI. To run it with GUI, run `npm run start`. To run it without GUI, run `npm run nogui`.

**NOTE**: If you use nogui, you need to make a .env file, that looks like this:
```
API_KEY="Api key for your LLM"
AI_TYPE="ai type, either gemini or claude"
IXL_USERNAME="your IXL username"
IXL_PASSWORD="your IXL password"
```

## Known bugs
- Sometimes, the AI just doesn't respond.
- Clicking is very buggy, since the IXL html is freaky
- Only some types of questions can be solved. The ones where you need to click points on a graph don't work.

## Contribution
If you'd like to contribute, please open an issue or PR. Any help is greatly appreciated!
