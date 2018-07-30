/* global process */
const SSH = require('simple-ssh');
const environment = process.env; // eslint-disable-line no-process-env

const user = environment.SWARM_USER;
const host = environment.SWARM_HOST;
const pass = environment.SW_PASS;
const branch = environment.BITBUCKET_BRANCH;

const envoyer = params => {
  const {env, app, dir, postDeploy, isSingle = false} = params;

  const ssh = new SSH({
    host,
    user,
    pass,
    baseDir: dir,
  });

  ssh.on('error', function(err) {
    console.log('Oops, something went wrong.');
    console.log(err);
    ssh.end();
    process.exit(1);
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
          process.exit(1);
        }
      },
    })
    .exec(`git checkout ${branch}`, {
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
          process.exit(1);
        }
      },
    })
    .exec(`git pull origin ${branch}`, {
      exit: (code, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
        if (code !== 0) {
          ssh.end();
          process.exit(1);
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
            process.exit(1);
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
            process.exit(1);
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
            process.exit(1);
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
          process.exit(1);
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
          process.exit(1);
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
          process.exit(1);
        } else {
          console.log('→ Success');
        }
      },
    })
    .start();
};

module.exports = envoyer;
