.PHONY: install start test test-unit test-integration test-e2e coverage lint lint-fix load-test clean

install:
	npm install

start:
	npm start

test:
	npm test

test-unit:
	npm run test:unit

test-integration:
	npm run test:integration

test-e2e:
	npm run test:e2e

coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

load-test:
	npm run test:load

clean:
	rm -rf coverage .nyc_output load-test-results.json
