const { exec } = require('child_process');
const { writeUrlsToFile } = require('./generateURLTxt');
require('dotenv').config()

const { BAIDU_TOKEN } = process.env

const url = `http://data.zz.baidu.com/urls?site=https://zidan.store&token=${BAIDU_TOKEN}`;
const filePath = 'urls.txt';

const commit = () => {
    if(writeUrlsToFile()) {
        
        const command = `curl -H 'Content-Type:text/plain' --data-binary @${filePath} "${url}"`;
        
        exec(command, (error, stdout) => {
          if (error) {
            console.error('Command execution error:', error);
            return;
          }
        
          console.log('Standard output:', stdout);
        });
    }
}

commit()