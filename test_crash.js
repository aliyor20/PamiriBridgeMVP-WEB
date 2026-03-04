const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log('BROWSER CONSOLE:', msg.type());
        msg.args().forEach(async arg => {
            try {
                console.log(await arg.jsonValue());
            } catch (e) { /* ignore */ }
        });
    });
    page.on('pageerror', error => console.error('PAGE ERROR Catch:', error.stack));

    console.log('Navigating to http://localhost:5173/explore...');
    await page.goto('http://localhost:5173/explore', { waitUntil: 'networkidle' });

    await browser.close();
})();
