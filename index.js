require('dotenv').config();

const fs = require('fs');
const path = require('path');
const url = require("url");
const https = require("https");
const rimraf = require('rimraf');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');

const log = (...args) => console.log("→", ...args);

const rootDir = path.resolve(process.env.OUTPUT_DIR);
const userName = process.env.USER_NAME;
const password = process.env.PASSWORD;
const headless = process.env.HEADLESS;


const loginAddress = 'https://www.studymed.at/login';

const sources = [
    {
        name: 'Biologie',
        link: 'https://www.studymed.at/backend/lernen/untertest/basiskenntnistest-biologie',
    },
    {
        name: 'Chemie',
        link: 'https://www.studymed.at/backend/lernen/untertest/basiskenntnistest-chemie',
    },
    {
        name: 'Mathe',
        link: 'https://www.studymed.at/backend/lernen/untertest/basiskenntnistest-mathe',
    },
    {
        name: 'Physik',
        link: 'https://www.studymed.at/backend/lernen/untertest/basiskenntnistest-physik',
    },
];

log('Resetting destination folder: ' + rootDir);

if (fs.existsSync(rootDir)) {
    rimraf.sync(rootDir);
}

fs.mkdirSync(rootDir);


let overview;


(async () => {
    log('Opening browser');
    const browser = await puppeteer.launch({
        headless,
        slowMo: 100,
        args: ["--disable-features=site-per-process"],
        executablePath: process.env.GOOGLE_CHROME_EXECUTABLE,
    });

    log('Opening new page');
    const page = await browser.newPage();

    log('Setting viewport');
    await page.setViewport({ width: 1280, height: 100000});

    log('Navigating to: ' + loginAddress);
    await page.goto(loginAddress, {
        waitUntil: 'networkidle0',
    });

    log('Logging in');
    await page.click('div.cookiebutton');

    await page.type('#LoginForm_useremail', userName);
    await page.type('#LoginForm_password', password);

    await Promise.all([
        page.$eval('#login-form', form => form.submit()),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    for (const source of sources) {
        await page.waitFor(getRandomInt(5000));

        const sourceDir = path.resolve(rootDir, source.name.replace(/[\/\.\\]/g, '-'));

        log('Creating ' + sourceDir);
        fs.mkdirSync(sourceDir);

        log('Navigating to: ' + source.link);
        await page.goto(source.link, {
            waitUntil: 'networkidle0',
        });

        overview = await page.$('section.test-boxen');

        await overview.screenshot({ path: path.resolve(sourceDir, 'Überblick.png') });

        // fs.writeFile(sourceDir + '/Download-von-Adresse.txt', source.link, (err) => { if (err) log(err); });

        const topics = await page.evaluate(() => {
            let entries = [];
            
            let innerElements = document.querySelectorAll('section.test-boxen div.column div.kapitel');

            for (const innerElement of innerElements) {
                const name = innerElement.querySelectorAll('h3')[0].textContent.replace(/^\s+|\s+$/g, '');
                const link = innerElement.querySelectorAll('a')[0].href;

                entries.push({
                    name,
                    link,
                });
            }

            return entries;
        });

        for (const topic of topics) {
            await page.waitFor(getRandomInt(5000));

            const topicDir = path.resolve(sourceDir, topic.name.replace(/[\/\.\\]/g, '-'));

            log('Creating ' + topicDir);
            fs.mkdirSync(topicDir);

            log('Navigating to: ' + topic.link);
            await page.goto(topic.link, {
                waitUntil: 'networkidle0',
            });

            overview = await page.$('div#content');

            await overview.screenshot({ path: path.resolve(topicDir, 'Überblick.png') });

            // fs.writeFile(topicDir + '/Download-von-Adresse.txt', topic.link, (err) => { if (err) log(err); });

            const subTopics = await page.evaluate(() => {
                let entries = [];
                
                let innerElements = document.querySelectorAll('div.inhalte-container div.unterkapitel');
    
                for (const innerElement of innerElements) {
                    const name = innerElement.querySelectorAll('h2')[0].textContent.replace(/^\s+|\s+$|\?/g, '').replace(/\s+/g, ' ');
                    const description = innerElement.querySelectorAll('div.column.small-12.description')[0].textContent.replace(/^\s+|\s+$/g, '');
                    const subElements = innerElement.querySelectorAll('div.column.small-12:not(.description) ul li');
    
                    const subElementList = [];

                    for (const subElement of subElements) {
                        if (subElement.querySelectorAll('i.icon-video').length > 0) {
                            subElementList.push({
                                name: subElement.textContent.replace(/^\s+|\s+$/g, ''),
                                type: 'video',
                                link: subElement.querySelectorAll('a')[0].href,
                            });
                        }

                        if (subElement.querySelectorAll('i.icon-script').length > 0) {
                            subElementList.push({
                                name: subElement.textContent.replace(/^\s+|\s+$/g, ''),
                                type: 'script',
                                link: subElement.querySelectorAll('a')[0].href,
                            });
                        }
                    }

                    entries.push({
                        name,
                        description,
                        subElements: subElementList,
                    });
                }
    
                return entries;
            });

            for (const subTopic of subTopics) {
                await page.waitFor(getRandomInt(5000));

                const subTopicDir = path.resolve(topicDir, subTopic.name.replace(/[\/\.\\]/g, '-'));

                log('Creating ' + subTopicDir);
                fs.mkdirSync(subTopicDir);

                fs.writeFile(subTopicDir + '/Beschreibung.txt', subTopic.description, (err) => { if (err) log(err); });

                for (const subElement of subTopic.subElements) {
                    await page.waitFor(getRandomInt(5000));

                    const subElementDir = path.resolve(subTopicDir, subElement.type + ' - ' + subElement.name.replace(/[\/\.\\]/g, '-'));

                    log('Creating ' + subElementDir);
                    fs.mkdirSync(subElementDir);

                    log('Navigating to: ' + subElement.link);
                    await page.goto(subElement.link, {
                        waitUntil: 'networkidle0',
                    });

                    // fs.writeFile(subElementDir + '/Download-von-Adresse.txt', subElement.link, (err) => { if (err) log(err); });

                    overview = await page.$('div#content');
                    await overview.screenshot({ path: path.resolve(subElementDir, 'Überblick.png') });
                    if (headless) await page.pdf({ path: path.resolve(subElementDir, 'Browser-PDF-Druck.pdf') });
                    // await page.screenshot({ path: path.resolve(subElementDir, 'Browser-Screenshot Ganze Seite.png'), fullPage: true });

                    if (subElement.type === 'video') {
                        log('Found video');

                        const iFrameLink = await page.evaluate(() => {
                            return document.querySelectorAll('div.vimeo iframe')[0].src;
                        });

                        log('iFrameLink: ' + iFrameLink);

                        const elementHandle = await page.$('div.vimeo iframe');
                        const frame = await elementHandle.contentFrame();
                        const content = await frame.content();
                        const match = content.match(/(\"progressive.*{[^}]*https[^\"]*\.mp4\"[^}]*}])/g)[0];
                        
                        const qualities = JSON.parse('{' + match + '}').progressive;
                        let highestQuality = 0;
                        let highestQualityLink = '';

                        for (const quality of qualities) {
                            if (quality.height > highestQuality) {
                                highestQuality = quality.height;
                                highestQualityLink = quality.url;
                            }
                        }
                        
                        log('Downloading (Quality ' + highestQuality + '): ' + highestQualityLink);

                        await new Promise((resolve) => {
                            download(
                                highestQualityLink,
                                path.resolve(subElementDir, subElement.name.replace(/[\/\.\\]/g, '-') + '.mp4'),
                                (err) => { if (err) log('Download-Error:' + err); resolve();
                            });
                        });
                    } else if (subElement.type === 'script') {
                        await page.evaluate(() => {
                            document.querySelectorAll('.blatt-header a')[0].target = '_self';
                        });

                        await Promise.all([
                            page.click('.blatt-header a'),
                            page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        ]);

                        overview = await page.$('body');
                        await overview.screenshot({ path: path.resolve(subElementDir, 'Print-Version-Überblick.png') });
                        if (headless) await page.pdf({ path: path.resolve(subElementDir, subElement.name.replace(/[\/\.\\]/g, '-') + '.pdf') });
                        // await page.screenshot({ path: path.resolve(subElementDir, 'Print-Version-Browser-Screenshot Ganze Seite.png'), fullPage: true });
                    }
                }
            }
        }
    }

    await browser.close();
})();

const download = function(url, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(cb);
      });
    }).on('error', function(err) {
      fs.unlink(dest);
      if (cb) cb(err.message);
    });
  };


// the first version of the downloader fetched audio and video separately
// from some vimeo link and merged the two parts with ffmpeg while the newer
// version downloads the whole video directly from some json file from vimeo
async function loadVideo(masterJsonUrl, path, name) {
    let masterUrl = masterJsonUrl;
    if (!masterUrl.endsWith("?base64_init=1")) {
      masterUrl += "?base64_init=1";
    }
  
    await new Promise((resolve, reject) => {
        getJson(masterUrl, (err, json) => {
            if (err) {
                reject(err);
            }
        
            const videoData = json.video
              .sort((v1, v2) => v1.avg_bitrate - v2.avg_bitrate)
              .pop();
            const audioData = json.audio
              .sort((a1, a2) => a1.avg_bitrate - a2.avg_bitrate)
              .pop();
        
            const videoBaseUrl = url.resolve(
              url.resolve(masterUrl, json.base_url),
              videoData.base_url
            );
            const audioBaseUrl = url.resolve(
              url.resolve(masterUrl, json.base_url),
              audioData.base_url
            );
        
            processFile(
              path,
              "video",
              videoBaseUrl,
              videoData.init_segment,
              videoData.segments,
              name + ".m4v",
              err => {
                if (err) {
                    reject(err);
                }
        
                processFile(
                  path,
                  "audio",
                  audioBaseUrl,
                  audioData.init_segment,
                  audioData.segments,
                  name + ".m4a",
                  err => {
                    if (err) {
                        reject(err);
                    }
        
                    ffmpeg()
                      .addInput(`${path}/${name + ".m4v"}`)
                      .addInput(`${path}/${name + ".m4a"}`)
                      .output(`${path}/${name + ".mp4"}`)
                      .audioCodec('copy')
                      .videoCodec('copy')
                      .on('end', function() {
                        rimraf.sync(`${path}/${name + ".m4v"}`);
                        rimraf.sync(`${path}/${name + ".m4a"}`);

                        resolve();
                      })
                      .run();
                  }
                );
              }
            );
          }); 
    });
  }
  
  function processFile(path, type, baseUrl, initData, segments, filename, cb) {
    const filePath = `${path}/${filename}`;
    const downloadingFlag = `${path}/.${filename}~`;
    
    if(fs.existsSync(downloadingFlag)) {
      log("⚠️", ` ${filename} - ${type} is incomplete, restarting the download`);
    } else if (fs.existsSync(filePath)) {
      log("⚠️", ` ${filename} - ${type} already exists`);
      return cb();
    } else {
      fs.writeFileSync(downloadingFlag, '');
    }
  
    const segmentsUrl = segments.map(seg => baseUrl + seg.url);
  
    const initBuffer = Buffer.from(initData, "base64");
    fs.writeFileSync(filePath, initBuffer);
  
    const output = fs.createWriteStream(filePath, {
      flags: "a"
    });
  
    combineSegments(type, 0, segmentsUrl, output, filePath, downloadingFlag, err => {
      if (err) {
        log("⚠️", ` ${err}`);
      }
  
      output.end();
      cb();
    });
  }
  
  function combineSegments(type, i, segmentsUrl, output, filename, downloadingFlag, cb) {
    if (i >= segmentsUrl.length) {
      fs.unlinkSync(downloadingFlag);
      log("🏁", ` ${filename} - ${type} done`);
      return cb();
    }
  
    log(
      "📦",
      type === "video" ? "📹" : "🎧",
      `Downloading ${type} segment ${i}/${segmentsUrl.length} of ${filename}`
    );
  
    setTimeout(() => {
        https
        .get(segmentsUrl[i], res => {
            res.on("data", d => output.write(d));
    
            res.on("end", () =>
            combineSegments(type, i + 1, segmentsUrl, output, filename, downloadingFlag, cb)
            );
        })
        .on("error", e => {
            cb(e);
        });
    }, getRandomInt(1000));
  }
  
  function getJson(url, cb) {
    let data = "";
  
    https
      .get(url, res => {
        res.on("data", d => (data += d));
  
        res.on("end", () => cb(null, JSON.parse(data)));
      })
      .on("error", e => {
        cb(e);
      });
  }

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
