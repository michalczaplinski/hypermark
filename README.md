📓 Hypermark 
=============

```
yarn dev
```


### Release 

When you want to create a new release, follow these steps:

1. Update the version in your project's package.json file (e.g. 1.2.3)
Commit that change (git commit -am v1.2.3)
2. Tag your commit (git tag v1.2.3). Make sure your tag name's format is v*.*.*. Your workflow will use this tag to detect when to create a release
3. Push your changes to GitHub (git push && git push --tags)
4. After building successfully, the action will publish your release artifacts. By default, a new release draft will be created on GitHub with download links for your app. If you want to change this behavior, have a look at the `electron-builder` docs.

### How to release (OLD)

1. Run ./release.sh --patch | --minor | --major
This creates a draft release on github, pushes all to master, and builds the master

2. Go to github and go to the releases tab and click "publish" for the release that you want

3. Update the download link on the website