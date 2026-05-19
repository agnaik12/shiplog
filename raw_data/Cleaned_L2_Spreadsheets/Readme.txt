Tab Separated Value Files have their filename structures as Ship_YYYY_Type.tsv where Type is a combination of one or more of:

	Ice for files that have at least one record of ice
	Wx for files that have at least one weather element, such as wind, barometer, temperature, weather type, etc.
	Posns for files that were transcribed in OW Phase III, and which contain just hourly positions. Kevin wanted hourly positions for a dozen of those files.

Data processing for these files consists of various checks.

Baro
   First I run a check looking for any oddities, such as:
      a character that's not a decimal or an integer; or,
      a value less than 27 or more than 32.

   Then I run a script to fix the data. It converts the strings found to
   a proper value. Values that are five characters long get the middle character,
   if not a digit, changed to a decimal. Things like 30:04 or 30 04 are converted to 30.04.
   Sometimes only a decimal value is given, so the sequence 29.92; .90; .89 are converted
   to 2992; 29.90; 29.89.

   Similarly, the decimal is not given, so the sequence 29.92; 90; 89 are converted the
   same way, but only if the integer values a less than 27 or more than 32.
   Things that aren't cleaned are converted are left as is.

   Finally, I look for jumps greater than 0.5 inches between two successive values. The values
   are converted to numbers, so things like 29.92? are converted to zero and show up as a 
   big jump. The list of bad pressures is displayed and I manually check each one with the log
   image. Usually it's a case of a typo error which can be immediately fixed. Sometimes it's 
   bad handwriting so an 8 looks like a 3 or a 4 looks like a 9. If I cannot determine if a value
   is incorrect, because no change seems reasonable, I leave it as is. I use the rest of the weather
   observation as a clue, as well.

Pressure
   Pressures are saved with two decimals.

Winds
   I convert wind directions from cardinal values to degrees, and wind speeds from Beaufort to knots.
   Winds are converted from Magnetic and displayed in a second column as True. Except in rare cases,
   wind directions are not indicated in the log as being Magnetic or True. If they are not indicated
   as True, they are assumed to be Magnetic. In these cases, both Magnetic and True direction columns
   are output.

Temperatures: Dry, Wet and Water
   I check for values out of bounds, or showing an excessive change in value between two successive values.
   Where I can determine the error, often a typo or misreading of poor handwriting, I correct it. If I 
   cannot determine the error, I leave it as is. Some values are obviously wrong. For example, Storis 1948
   was moored at the Coast Guard Yard Curtis Bay, MD. She often reported very high temperatures in the
   afternoon which were much higher than the daily maximum temperatures at Baltimore Walbrook and 
   Baltimore Customs House.

Cloud or Clear Sky Amount
   Files before 1900 reported amount of clear sky, whereas later files reported amount of cloud.
   I changed the headings on the columns with amount of clear sky to Clear.
   I also corrected any values greater than 10 or with contained Alpha characters.

Numeric Columns
   All columns that should be numeric are checked to ensure that all values are numeric. The only 
   exception is the Hgt column, which often displays the height of cloud for more than one layer.

I did nothing with the other columns: Attd, Weather, Clouds, etc.
   Although the instructions in the log books indicate that capital letters indicate higher intensity
   of precipitation, in general log keepers seem to use either all caps or all lower case, meaning
   that the presence of capital letters is meaningless.

   Some log keepers prefer to use things like Sc-Cu, while others use Sc Cu. The notations change
   when the handwriting changes, leaving me in doubt whether they are indicating one cloud type
   or two.

Note: Those images that were typed had numerous errors, many of which were impossible to correct, not
      being able to read the original log page. Where I could not reasonably determine a realistic
      value, I left the value unchanged.
