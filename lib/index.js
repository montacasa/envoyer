/* global process */
const SSH = require('simple-ssh');
const env = process.env; // eslint-disable-line no-process-env

const user = env.SWARM_USER;
const host = env.SWARM_HOST;
const pass = env.SW_PASS;
const branch = env.BITBUCKET_BRANCH;

const envoyer = (environment, app, baseDir, postDeploy) => {
  const ssh = new SSH({
    host,
    user,
    pass,
    baseDir,
  });

  ssh.on('error', function(err) {
    console.log('Oops, something went wrong.');
    console.log(err);
    ssh.end();
  });

  ssh
    .exec('git fetch', {
      in: () => {
        console.log('→ Pulling repo');
      },
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        }
      },
    })
    .exec(`git checkout ${branch}`, {
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        }
      },
    })
    .exec(`git pull origin ${branch}`, {
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        }
      },
    })
    .exec(
      `docker-compose -f docker-compose.yml -f docker-compose.${environment}.yml build`,
      {
        in: () => {
          console.log('→ Building compose output file');
        },
        exit: (code, stdout, stderr) => {
          console.log(stdout);
          console.log(stderr);
          if (code !== 0) {
            ssh.end();
          }
        },
      },
    )
    .exec(
      `docker-compose -f docker-compose.yml -f docker-compose.${environment}.yml push`,
      {
        in: () => {
          console.log('→ Pushing image to registry');
        },
        exit: (code, stdout, stderr) => {
          console.log(stdout);
          console.log(stderr);
          if (code !== 0) {
            ssh.end();
          }
        },
      },
    )
    .exec(
      `docker-compose -f docker-compose.yml -f docker-compose.${environment}.yml config > output.yml`,
      {
        in: () => {
          console.log('→ Creating output file');
        },
        exit: (code, stdout, stderr) => {
          console.log(stdout);
          console.log(stderr);
          if (code !== 0) {
            ssh.end();
          }
        },
      },
    )
    .exec(`docker stack deploy --with-registry-auth -c output.yml ${app}`, {
      in: () => {
        console.log('→ Updating stack');
      },
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        }
      },
    })
    .exec('rm -f output.yml', {
      in: () => {
        console.log('→ Cleaning up');
      },
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        }
      },
    })
    .exec(postDeploy || 'echo That is all!', {
      in: () => {
        console.log('→ Running post deploy script');
      },
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
        } else {
          console.log('→ Success');
        }
      },
    })
    .start();
};

module.exports = envoyer;
