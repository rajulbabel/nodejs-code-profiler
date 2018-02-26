'use strict';

require('should');
const BluebirdPromise = require('bluebird');
const fs = require('fs');

const ErrorLib = require('../src/ErrorLib');

describe('Promise Profiler', function() {

	describe('should profile correctly for bluebird promises', function () {

		const bluebirdPromiseProfiler = require('../src/promise_profiler');
		before(function beforeAll () {
			bluebirdPromiseProfiler.startProfiling();
		});

		after(function afterAll () {
			bluebirdPromiseProfiler.stopProfiling();
		});

		afterEach(function afterEachFunction () {
			bluebirdPromiseProfiler.resetProfiler();
		});

		const getPromise1 = function getPromise1 () {

			return new BluebirdPromise (function promise1Functon (resolve, reject) {

				setTimeout(function promise1Timeout () {
					resolve(1);
				}, 2000);

			});

		};

		const getPromise2 = function getPromise2 () {

			return new BluebirdPromise (function promise2Functon (resolve, reject) {

				setTimeout(function promise1Timeout () {
					resolve(2);
				}, 1000);

			});

		};

		const getPromise3 = function getPromise2 () {

			return new BluebirdPromise (function promise3Functon (resolve, reject) {

				setTimeout(function promise1Timeout () {
					reject(new Error('3'));
				}, 2000);

			});

		};

		const getPromise4 = function getPromise2 () {

			return new BluebirdPromise (function promise4Functon (resolve, reject) {

				setTimeout(function promise1Timeout () {
					reject(new Error('4'));
				}, 1000);

			});

		};

		it('for .then()', function(done) {

			getPromise1().then(function promise1Then (result) {
				result.should.equal(1);
			});

			getPromise2().then(function promise2Then (result) {
				result.should.equal(2);
			});

			setTimeout(function wait () {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				Object.keys(profilerResult).length.should.equal(2);
				profilerResult.should.have.property('promise1Then');
				profilerResult.should.have.property('promise2Then');
				done();

			}, 3000);

		});

		it('for .catch()', function (done) {

			getPromise3().catch(function promise3Catch (result) {
				result.message.should.equal('3');
			});

			getPromise4().catch(function promise4Catch (result) {
				result.message.should.equal('4');
			});

			setTimeout(function wait () {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				Object.keys(profilerResult).length.should.equal(2);
				profilerResult.should.have.property('promise3Catch');
				profilerResult.should.have.property('promise4Catch');
				done();

			}, 3000);

		});

		it('for .spread() on resolving promises', function(done) {

			BluebirdPromise.join(getPromise1(), getPromise2()).spread(function spreadFunction (promise1Result, promise2Result) {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				promise1Result.should.equal(1);
				promise2Result.should.equal(2);
				Object.keys(profilerResult).length.should.equal(1);
				profilerResult.should.have.property('spreadFunction');
				done();

			});

		});

		it('for .spread() on rejecting promises', function(done) {

			BluebirdPromise.join(getPromise3(), getPromise4()).catch(function catchFunction (res) {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				Object.keys(profilerResult).length.should.equal(1);
				profilerResult.should.have.property('catchFunction');
				done();
			});

		});

		it('for .then() and .spread() on resolving promises', function(done) {

			const promise1 = getPromise1();
			const promise2 = getPromise2();

			promise1.then(function promise1Then (result) {
				result.should.equal(1);
			});

			promise2.then(function promise2Then (result) {
				result.should.equal(2);
			});

			BluebirdPromise.join(promise1, promise2).spread(function spreadFunction (promise1Result, promise2Result) {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				promise1Result.should.equal(1);
				promise2Result.should.equal(2);
				Object.keys(profilerResult).length.should.equal(3);
				profilerResult.should.have.property('promise1Then');
				profilerResult.should.have.property('promise2Then');
				profilerResult.should.have.property('spreadFunction');
				done();

			});

		});

		it('for writing profiler results to file', function (done) {

			getPromise1().then(function promise1Then (result) {

				const fullFilePath = __dirname + '/output.json';
				const readFile = BluebirdPromise.promisify(fs.readFile);
				bluebirdPromiseProfiler.writeProfilerResultToFile(fullFilePath).then(function callback () {

					readFile(fullFilePath).then(function (result) {

						const output = JSON.parse(result);
						output.should.have.property('promise1Then');
						fs.unlink(fullFilePath, function callback () {
							done();
						});

					});

				});

			});

		});

		it('if startProfiling is called twice or more', function (done) {


			bluebirdPromiseProfiler.startProfiling();
			bluebirdPromiseProfiler.startProfiling();

			getPromise1().then(function promise1Then (result) {

				const profilerResult = bluebirdPromiseProfiler.getProfilerResult();
				result.should.equal(1);
				Object.keys(profilerResult).length.should.equal(1);
				profilerResult.should.have.property('promise1Then');
				done();

			});

		});
	});

	describe('should error out', function () {

		it('for bluebird promise not found', function (done) {

			const prevENV = process.env.NODE_ENV;
			process.env.NODE_ENV = 'test';

			try {
				const bluebirdPromiseProfiler = new (require('../src/promise_profiler')).__proto__.constructor();
				process.env.NODE_ENV = prevENV;
			}
			catch (err) {
				err.message.should.equal(ErrorLib.errorMap.PromiseNotFound.message);
				process.env.NODE_ENV = prevENV;
				done();
			}
		});
	});

});
