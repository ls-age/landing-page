/* eslint-disable import/no-commonjs */

const FtpDeploy = require('ftp-deploy');

const ftpDeploy = new FtpDeploy();

const printProgress = ({ transferredFileCount, totalFilesCount, filename }) => {
  if (process.stdout.clearLine) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }

  process.stdout.write(`${transferredFileCount} / ${totalFilesCount} | ${filename}`);
};

ftpDeploy.on('uploading', printProgress);
ftpDeploy.on('uploaded', printProgress);

ftpDeploy
  .deploy({
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    host: process.env.FTP_HOST,
    port: 21,
    secure: true,
    secureOptions: {
      rejectUnauthorized: false,
    },

    localRoot: '__sapper__/export',
    remoteRoot: process.env.FTP_ROOT,
    include: ['*', '**/*'],
    deleteRemove: false,
    forcePasv: true,
  })
  .catch((error) => {
    console.error(error); // eslint-disable-line no-console
    process.exitCode = 1;
  });
