export class TimeUtils {
	public static timeFromString(timeString: string): number | null {
		let time;

		if (timeString != null && timeString.length > 1) {
			let slicedTime;
			let slicedUnit;
			if (timeString.toLowerCase().endsWith('min')) {
				slicedTime = timeString.slice(0, -3);
				slicedUnit = 'min';
			}
			else {
				slicedTime = timeString.slice(0, -1);
				slicedUnit = timeString.slice(-1).toLowerCase();
			}

			if (!isNaN(Number(slicedTime))) {
				const slicedTimeInt = parseInt(slicedTime);
				if (slicedTimeInt <= 0) {
					throw new Error('The time cannot be equal or inferior to 0');
				}

				switch (slicedUnit) {
				case 'min':
					time = slicedTimeInt * 60000;
					break;
				case 'h':
					time = slicedTimeInt * 3600000;
					break;
				case 'd':
					time = slicedTimeInt * 86400000;
					break;
				case 'm':
					time = slicedTimeInt * 2592000000;
					break;
				case 'y':
					time = slicedTimeInt * 31104000000;
					break;
				default:
					throw new Error(`No matching unit for ${slicedUnit}`);
				}
			}
			else {
				throw new Error('The time has to be a number');
			}
		}
		else {
			throw new Error('Wrong parsing for the date');
		}

		return time;
	}
}