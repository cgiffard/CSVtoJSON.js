// CSV2JSON
// Christopher Giffard

// Using a state loop, rather than regex or split-by-line
// The idea is this *should* parse really badly formatted CSVs.

// I haven't been bothered to make this work with STDIN and/or streams yet.
// Will eventually.

function parseCSV(textData, callback) {
	textData = textData instanceof String ? textData : String(textData || "");
	
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
	var errorLog			= [];
	
	var GRAMMAR_QUOTEMARK	= "\"";
	var GRAMMAR_ESCAPE		= "\\";
	var GRAMMAR_NEWLINE		= "\n";
	var GRAMMAR_NEWLINE_ALT	= "\r";
	var GRAMMAR_DELIMITER	= ",";
	
	callback = callback instanceof Function ? callback : function() {};
	
	function logErr(message) {
		errorLog.push(message);
	};

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
						logErr("Value out of range relative to header! Dropped. [Line " + (++lineIndex) + ", Char " + (++lineCharIndex) + "]");
					}
				}


				// Only incrememt the row index if the last row had data
				if (!rowIsEmpty) {
					rowIndex ++;
					rowIsEmpty = true; // ...and reset.
				}
			} else {
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
						logErr("Value out of range relative to header! Dropped. [Line " + (++lineIndex) + ", Char " + (++lineCharIndex) + "]");
					}
				}
			} else {
				logErr("Found empty value for '" + csvHeaderRow[valueIndex] + "'! Dropped. [Line " + (++lineIndex) + ", Char " + (++lineCharIndex) + "]");
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
			logErr("Hit unhandled escape character '" + currentCharacter + "'. Dropped. [Line " + (++lineIndex) + ", Char " + (++lineCharIndex) + "]");
		
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
	return callback((errorLog.length ? errorLog : null),processedData);
}

module.exports = parseCSV;