#!/usr/bin/env node

// Using a state loop, rather than regex or split-by-line
// The idea is this *should* parse really badly formatted CSVs.

// I haven't been bothered to make this work with STDIN yet.
// Will eventually.

var fs = require("fs");

// Collect files we've been asked to parse
var files = process.argv.slice(1).filter(function(item) { return (item.toLowerCase().indexOf(".js") === -1); });

if (files.length) {
	files.forEach(parseConvert);
} else {
	// In future, open STDIN
	console.error("No files specified for conversion.");
}

function parseConvert(filename) {
	var fileBuffer;
	try {
		if ((fileBuffer = fs.readFileSync(filename))) {
			parseCSV(
				fileBuffer.toString(),
				function(outputData) {
					
				},
				function(errorDetail) {
					console.error("An error occurred while attempting to process '%s'.",filename);
					console.error(errorDetail);
				});
		} else {
			console.error("Unable to locate or open the file '%s'.",filename);
		}
	} catch(error) {
		console.error("Unable to locate, open, or parse the file '%s'.",filename);
		console.log(error);
	}
}

function parseCSV(textData, success, error) {
	var cachedLength		= textData.length;
	var previousCharacter	= null;
	var currentCharacter	= null;
	var lineType			= "header";
	var inQuotedValue		= false;
	var currentValue		= "";
	var processedData		= [];
	var csvHeaderRow		= [];
	var valueIndex			= 0;
	var lineIndex			= 0;
	var lineCharIndex		= 0;
	var rowIndex			= 0;
	var rowIsEmpty			= true;
	
	var GRAMMAR_QUOTEMARK	= "\"";
	var GRAMMAR_ESCAPE		= "\\";
	var GRAMMAR_NEWLINE		= "\n";
	var GRAMMAR_NEWLINE_ALT	= "\r";
	var GRAMMAR_DELIMITER	= ",";

	// Only for debugging!
	// console.log("Processing %d chars.",cachedLength);
	
	for (var characterIndex = 0; characterIndex < cachedLength; characterIndex++) {
		currentCharacter = textData.substr(characterIndex,1);
		
		// Ensure our line and character positions are correct (for debugging)
		if (currentCharacter === GRAMMAR_NEWLINE) {
			lineIndex ++;
			lineCharIndex = 0;
		} else {
			lineCharIndex ++;
		}

		if (currentCharacter === GRAMMAR_QUOTEMARK && previousCharacter !== GRAMMAR_ESCAPE) {
			// Either a starting or ending quote.
			// Flip our quoted value state around
			inQuotedValue = !inQuotedValue;

		} else if ((currentCharacter === GRAMMAR_NEWLINE || currentCharacter === GRAMMAR_NEWLINE_ALT) &&
						previousCharacter !== GRAMMAR_ESCAPE && !inQuotedValue) {
			
			// We hit a newline while not in quotes or preceded by an escape character.
			// Push the line onto the stack, and assume we're moving to the next line

			if (lineType !== "header") {

				// Push final value for row into data
				if (currentValue.length) {
					if (csvHeaderRow[valueIndex]) {
						
						// Lazy row creation (so if a row is blank, we don't make a junky row)
						if (!processedData[rowIndex]) {
							processedData.push({});
							rowIsEmpty = false;
						}

						processedData[rowIndex][csvHeaderRow[valueIndex]] = currentValue;
					} else {
						console.error("Value out of range relative to header! Dropped. [Line %d, Char %d]",++lineIndex,++lineCharIndex);
					}
				}


				// Only incrememt the row index if the last row had data
				if (!rowIsEmpty) {
					rowIndex ++;
					rowIsEmpty = true; // ...and reset.
				}
			} else {
				console.error("Shifting from head, value so far:",currentValue);
				lineType = "body";

				if (currentValue.length) {
					csvHeaderRow.push(currentValue);
				}
			}

			currentValue = "";
			valueIndex = 0;

		} else if (currentCharacter === GRAMMAR_DELIMITER && previousCharacter !== GRAMMAR_ESCAPE && !inQuotedValue) {
			// We hit a value delimiter while not in quotes or preceded by an escape character.
			// Push the value into the current row object, and increase value index

			if (currentValue.length) {
				if (lineType === "header") {
					csvHeaderRow.push(currentValue);
				} else {
					if (csvHeaderRow[valueIndex]) {
						
						// Lazy row creation (so if a row is blank, we don't make a junky row)
						if (!processedData[rowIndex]) {
							processedData.push({});
							rowIsEmpty = false;
						}

						processedData[rowIndex][csvHeaderRow[valueIndex]] = currentValue;
					} else {
						console.error("Value out of range relative to header! Dropped. [Line %d, Char %d]",++lineIndex,++lineCharIndex);
					}
				}
			} else {
				console.error("Found empty value for '%s'! Dropped. [Line %d, Char %d]",csvHeaderRow[valueIndex],++lineIndex,++lineCharIndex);
			}

			currentValue = "";
			valueIndex ++;
		
		} else if (currentCharacter === GRAMMAR_ESCAPE && previousCharacter !== GRAMMAR_ESCAPE) {
			// Don't include single escape characters in the file.
			// Just ignore for now
			
		} else if (previousCharacter === GRAMMAR_ESCAPE &&
					(currentCharacter !== GRAMMAR_NEWLINE && currentCharacter !== GRAMMAR_NEWLINE_ALT)) {
			
			// Altermate escape logic will go here...
			// Still parses pretty much anything without any fancy escapes
			console.error("Hit unhandled escape character '%s'. Dropped. [Line %d, Char %d]",currentCharacter,++lineIndex,++lineCharIndex);
		
		} else if (previousCharacter === GRAMMAR_NEWLINE && currentCharacter === GRAMMAR_NEWLINE_ALT) {
			// Windows Line-break.
			// Drop it!
			
		} else {
			// No other instructions? Just build on our current value!
			currentValue += currentCharacter;
		}

		previousCharacter = currentCharacter;
	}

	// Only for debugging!
	// console.log("Processed %d row data structure out of %d line file.",processedData.length,++lineIndex);
	console.log(JSON.stringify(processedData));
}