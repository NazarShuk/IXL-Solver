# IXL Solver
Uses puppeteer to log in to your IXL account, and solve questions using Anthropic Claude ai.

## Usage
Clone the repository, open it in a terminal, and run `npm install`. After that create a new file, called `.env`, put this inside of it, but replace the values with your's:
```
ANTHROPIC_API_KEY="..."
IXL_USERNAME="..."
IXL_PASSWORD="..."
```
After that, run `npm run start`, and a new chromium window should appear, it will log in to your ixl account. After that, in the console, you will be asked to put in a link for the IXL skill you want to do.
If you did everything correctly, the program should automatically start solving the IXL skill.

## Known bugs
- Sometimes, the ai just doesnt respond. I tried to fix it, but it doesn't work all the time
- Clicking is very buggy, since the IXL html is freaky
- Only some types of questions can be solved. The ones where you need to click points on a graph don't work.
