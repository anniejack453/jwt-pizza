# Curiosity Report: NPM

## Introduction

I chose NPM because we use it so often in many different classes and projects, yet a lot of it is still a mystery to me. I follow all the commands I am told to type, but do I actually know what they do? Not really! So this report is going under the hood to understand the secrets of NPM.

## What does it actually do?

NPM was first created as a package manager for Node.js, but is now the largest software registry in the world (while still being a package manager). It contains over 2.1 million code packages. And it is all free to use! Developers can use npm to share software, as well as manage private projects.

## The Essential Commands

### npm init

This is typically one of the first commands to run. npm init initializes a Node.js project by creating the package.json file, which contains the project name, version, dependencies, scripts, etc. If you add -y at the end of the command, you skip prompts and create a default package.json file.

### npm install

If you have a package.json file in your project, running npm install will automatically install all the required packages/dependencies found in that file, and put them in a node_modules folder.

#### Special Add-ons for npm install

If you run npm install <specific package name>, you install that specific package whether it's in your package.json file or not, and will add the package to your package.json dependencies
Adding --save-dev installs the package and adds it to devDependencies in package.json.
Adding --no-save installs the package but doesn't save it to the package.json dependencies.

### npm update

Automatically searches for the most recent update for the project packages and install it if possible. npm update <specific package name> updates a specific package.

### npm run <task-name>

In your package.json file, you can specify scripts in the scripts section that you can then choose to run using this command plus the script name.

For example: npm run start can entail "start": "cd src && node index.js" in the scripts section of package.json.

### npm audit

npm audit scans your project's dependencies and looks for security vulnerabilities. It checks your dependencies against the npm security team's database of known vulnerabilities and gives a report on any issues found. You can read the report and decide which actions to take to resolve your vulnerabilities.

#### Special add-ons

npm audit fix scans for vulnerabilities and automatically installs any compatible updates to the vulnerable dependencies. It runs an npm install under the hood.

npm audit fix --force installs all updates to fix the vulnerable dependencies, but the changes may not be compatible and/or break your project. Use with caution!

## Fun but Cool Commands

### npm dedupe

npm dedupe decreases the size of the node_modules folder by removing duplicate packages across dependencies and keeps the best version of that package.

### npm shrinkwrap

npm shrinkwrap either turns package-lock.json into a publishable npm-shrinkwrap.json or creates a new one. This file locks down dependency versions for publication.

## Try it for yourself

1. Clone this repository
2. Check out package.json. See all the dependencies and scripts?
3. Run npm install to install the dependencies
4. Try running a script or two using npm run <script-name>
5. Try npm audit and read the report. Decide what you want to do to fix the issues, if there are any
6. Congrats, you have learned some npm fundamentals!

## Conclusion

I think understanding npm is very important because it is so widely used and has a big role in any projects it is a part of. Having the right packages installed is essential to having a safe, well-functioning project. Instead of just running commands as we are told, it's better to understand the meaning behind them to better know what is happening behind the scenes with your code.
