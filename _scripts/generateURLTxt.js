const { resolve, relative, basename } = require('path')
const { readFileSync, writeFileSync } = require('fs')

const { globSync } = require('glob')

const urlTextFile  = resolve('urls.txt')
const postDir = resolve('.', 'source', '_posts')
const mdSuffix = '.md'

const defaultUrls = [
    'https://zidan.store',
    'http://zidan.store',
    'https://zidan.store/about',
    'http://zidan.store/about',
    'https://zidan.store/archives',
    'http://zidan.store/archives'
]

const postFile = globSync(`${postDir}/**/*.md`).map(i => basename(relative(postDir, i), mdSuffix) )

const getDate = (name) => {
    const fileContent = readFileSync(resolve(postDir, `${name}${mdSuffix}`), 'utf-8')
    const regex = /date:\s(\d{4}-\d{2}-\d{2}\s)/;
    const match = fileContent.match(regex);
    if (match && match[1]) {
        const dateValue = match[1].trim();
        return dateValue.replace(/\-/g, '/')
    }
    return null
}

const setUrls = () => {
    const urls = [...defaultUrls]
    postFile.forEach(i => {
        const date = getDate(i)
        const url = `//zidan.store/${date}/${i}`
        const http = `http:${url}`
        const https = `https:${url}`
        urls.push(http, https)
    })
    return urls
}

const writeUrlsToFile = () => {
    const allURL = setUrls()
    const urlStr = allURL.join('\n')
    writeFileSync(urlTextFile, urlStr)
    return true
    
}

exports.writeUrlsToFile =  writeUrlsToFile






