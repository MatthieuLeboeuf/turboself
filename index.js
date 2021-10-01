const { default: axios } = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
require('dotenv-flow').config();
(async () => {
    const browser = await puppeteer.launch({headless:false, defaultViewport: {width: 1280, height: 720}});
    const page = await browser.newPage();
    await page.goto('https://espacenumerique.turbo-self.com/Connexion.aspx', {waitUntil: 'networkidle0', timeout: 60000});

    await page.type('#ctl00_cntForm_txtLogin', process.env.TURBOSELF_EMAIL);
    await page.type('#ctl00_cntForm_txtMotDePasse', process.env.TURBOSELF_PASSWORD);
    await page.click('#ctl00_cntForm_btnConnexion');
    await page.waitForSelector('#ctl00_cntForm_UC_collapseMenu_lbtReserver', {timeout: 60000});
    await page.click('#ctl00_cntForm_UC_collapseMenu_lbtReserver');
    await page.waitForSelector('#weeknumber_0');

    const reservations = await page.$$eval('.day_line', lines => {
        let reservation = []
        for (line of lines) {
          if (line.childElementCount > 1 && ! line.childNodes[1].className.includes('disabled')) {
            reservation.push({
              date: line.childNodes[0].value,
              reserved: line.childNodes[2].childNodes[3].classList[1] === 'on' ? true : false
            });
          }
        }
        return reservation
    });

    const dateObj = new Date();
    let month = dateObj.getUTCMonth() + 1;
    if (month.toString().length != 2) {
      month = "0"+month.toString();
    }
    let day = dateObj.getUTCDate();
    if (day.toString().length != 2) {
      day = "0"+day.toString();
    }
    let year = dateObj.getUTCFullYear();
    const datet = day.toString() + month.toString() + year.toString();

    reservations.forEach(element => {
      if (element.date == datet && element.reserved == false) {
        axios.post(process.env.SMS_URL, { access_token: process.env.SMS_TOKEN, to: process.env.SMS_TO, message: "Repas: attention tu ne pourras pas manger aujourd'hui !" });
      }
    });

    await browser.close();
})();