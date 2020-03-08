default: clean weekly-report

.PHONY: weekly-report

clean:
	rm -rf dist

weekly-report:
	npx ncc build lib/weekly-report/index.js -o dist -m
	mv dist/index.js dist/weekly-report.js