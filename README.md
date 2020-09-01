# medAT studymed.at Downloader

### What
Downloads learning material like videos and scripts from the learning platform studymed.at.

### Why
Even though studymed.at does a great job at providing demanding content and wrapping the content into a easy to use platform, it is hard to click on every download and print sign on the page. Additionally, it is quite time consuming to create the folder-hierarchy and sort the content respectively. 

### How to use

Clone this repo and navigate in the cloned folder, then run:

```
npm install
npm run start
```

### Configuration

Rename or copy the `.env.example` file to `.env` and edit the following configs:

```
# username and password from studymed.at
USER_NAME=user@email.at
PASSWORD=********

# should the downloader start a brwoser window?
# set this to false as some printing features
# will not work with a visible browser window
HEADLESS=true

# name of the directory to save the downloaded content
# resolved with path.resolve from current directory
OUTPUT_DIR=output

# the path to the executable (bin) file from the chrom app
# maybe it also works with other puppeteer compatible browsers
# during startup of the script, an instance of the given app is created
# this example links to an .app-file locatet in the current directory
GOOGLE_CHROME_EXECUTABLE=.//Google Chrome.app/Contents/MacOS/Google Chrome
```

