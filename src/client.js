import Promise from 'bluebird';
import Travis  from 'travis-ci';
import _       from 'lodash';
import chalk   from 'chalk';
import config  from './config'

/**
 * @param {Mozaik} mozaik
 * @returns {Function}
 */
const client = mozaik => {
    mozaik.loadApiConfig(config);

    const travis = new Travis({
        version: '2.0.0',
        pro: true,
    });

    // make auth promise
    const authPromise = new Promise((resolve, reject) => {
        const token = config.get('github.token');
        if (token === undefined) {
            reject(`Missing env variable: GITHUB_TOKEN`);
        }

        travis.authenticate({
            github_token: token
        }, (err) => {
            if (err) reject(`Authentication failed ${JSON.stringify(err)}`);
            else resolve(true);
        });
    });

    return {
        /**
         * Fetch repository info.
         *
         * @param {object} params
         * @param {string} params.owner
         * @param {string} params.repository
         * @returns {Promise}
         */
        repository({ owner, repository }) {
            const def = Promise.defer();

            mozaik.logger.info(chalk.yellow(`[travis] calling repository: ${owner}/${repository}`));

            travis.repos(owner, repository).get((err, res) => {
                if (err) {
                    def.reject(err);
                }

                def.resolve(res.repo);
            });
            mozaik.logger.info(chalk.yellow(`FOOBAR`));

            mozaik.logger.info(chalk.yellow(`foobar step 1`));

            return def.promise;
        },

        repositoryBuildStatuses({ owner }) {
            //dirty non-dry 
            travis.repos(owner).get((err, res) => {
                if (err) {
                    def.reject(err);
                }

                def.resolve(res.repo);
            });
        }

        repositoriesForOwner({ owner }) {
            const def = Promise.defer();

            authPromise
                .then(() => {
                    mozaik.logger.info(chalk.yellow(`[travis] getting repos for: ${owner}`));
                    travis.repos('zeppelin-no').get((err, res) => {
                        if (!err) {
                            mozaik.logger.info(chalk.yellow(`[travis] got repos ${JSON.stringify(res)}`));
                            def.resolve(res)
                        }
                        else {
                            def.reject(err)
                        }
                    })
                })
                .catch((err) => {
                    mozaik.logger.info(chalk.yellow(`[travis] AUTH failed ${JSON.stringify(err)}`));
                    def.reject(err)
                });

            return def.promise;
        },

        /**
         * Fetch repository build history.
         *
         * @param {object} params
         * @param {string} params.owner
         * @param {string} params.repository
         * @returns {Promise}
         */
        buildHistory({ owner, repository }) {
            const def = Promise.defer();

            mozaik.logger.info(chalk.yellow(`[travis] calling buildHistory: ${owner}/${repository}`));

            travis.repos(owner, repository).builds.get((err, res) => {
                if (err) {
                    def.reject(err);
                }

                res.builds.forEach(build => {
                    const commit = _.find(res.commits, { id: build.commit_id });
                    if (commit) {
                        build.commit = commit;
                    }
                });

                def.resolve(res.builds);
            });

            // authPromise
            //     .then(() => {
            //         mozaik.logger.info(chalk.yellow(`foobar step 2`));
            //         return travis.repos('zeppelin-no').get((err, res) => {
            //             mozaik.logger.info(chalk.yellow(`foobar step 3 ${JSON.stringify(res)}`));
            //         })
            //     })
            //     .catch((err) => {
            //         mozaik.logger.info(chalk.yellow(`foobar fail 1`));
            //         // reject(err)
            //     });

            return def.promise;
        },
    };
};


export default client;