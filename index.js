
const shell = require('shelljs');
const path = require('path');
const fse = require('fs-extra');
const figlet = require('figlet');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
console.log(__dirname)
const version = require('../package.json').version;

let newVersion = version;

if (!shell.which('git')) {
  shell.echo('Sorry, this script requires git');
  shell.exit(1);
}

console.log(chalk.blue(
  figlet.textSync("BIMA SES", {
    font: 'Ghost'
  })
));

const buildDir = path.resolve(__dirname, '../build');
const indexDir = path.resolve(__dirname, '../build/index.html');

function cpHtml (newVer) {
  try {
    fse.copySync(`${buildDir}/${newVer}/index.html`, indexDir);
    console.log('copy success!');
  } catch (err) {
    process.exit(1);
    console.error(err);
  }
}

function getNewVersion (type) {
  let arr = version.split('.');
  if (type === 0) {
    let cur = +arr[0] + 1;
    return `${cur}.0.0`;
  } else if (type === 1) {
    let cur = +arr[1] + 1;
    return version.replace(/\..*$/, `.${cur}.0`);
  } else if (type === 2) {
    let cur = +arr[2] + 1;
    return version.replace(/\d+$/, `${cur}`);
  }
}

function updateVersion () {
  let dir = path.resolve(__dirname, '../package.json');
  let pkg = fse.readFileSync(dir, 'utf-8');
  pkg = JSON.parse(pkg);
  pkg.version = newVersion;
  pkg = JSON.stringify(pkg, null, 2);
  fse.writeFileSync(dir, pkg);
  console.log('update version', JSON.parse(pkg).version);
}

inquirer.prompt([{
  type: 'list',
  message: '请选择发布版本:',
  name: 'type',
  choices: [
    'dev',
    new inquirer.Separator(),
    'hotfix',
    "feature",
    "version",
  ],
  filter: function (val) {
    return val.toLowerCase();
  }
}]).then(answer => {
  let branch = 'master';
  let spinner = null;
  if (answer.type === 'dev') {
    branch = 'dev';
    console.log('publish Dev');
    spinner = ora('dev publish').start();
  } else {
    spinner = ora('production publish').start();
  }

  if (answer.type === 'hotfix') {
    newVersion = getNewVersion(2);
  }
  if (answer.type === 'feature') {
    newVersion = getNewVersion(1);
  }
  if (answer.type === 'version') {
    newVersion = getNewVersion(0);
  }
  console.log(`${version} ==> ${newVersion}`);

  try {
    shell.exec('git add --all');
    shell.exec(`git commit -m 'start publish'`);
    shell.exec(`git checkout ${branch}`);
    shell.exec(`git pull origin ${branch}`);
    // shell.exec('npm install --registry https://registry.npm.taobao.org')
    if (branch === 'master') {
      updateVersion();
    }
    shell.exec(`npm run build:${branch === 'master' ? 'pro' : 'dev'}`);
    if (branch === 'master') {
      cpHtml(newVersion);
    }
    shell.exec('git add --all');
    shell.exec(`git commit -m 'public version ${branch === 'dev' ? new Date().toLocaleString() : newVersion}'`);
    shell.exec(`git push origin ${branch}`);
    if (branch === 'master') {
      shell.exec(`git tag ${newVersion}`);
      shell.exec(`git push origin ${newVersion}`);
    }
    spinner.succeed();
  } catch (err) {
    process.exit(0);
    spinner.fail();
    throw new Error(err);
  }
});
