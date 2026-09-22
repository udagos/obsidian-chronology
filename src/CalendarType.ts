import { moment } from "obsidian";

export enum CalendarItemType {
    Day,
    Week,
    Month,
    Year,
    Range,
    All,
    StaleRange,
}

export class CalendarItem {
    date: moment.Moment;
    type: CalendarItemType;
    toDate?: moment.Moment | undefined;
    isStaleFilter?: boolean;
    staleWindowDays?: number;

    /**
     *
     */
    constructor(
        date: moment.Moment,
        type = CalendarItemType.Day,
        toDate?: moment.Moment,
        isStaleFilter = false,
        staleWindowDays?: number
    ) {
        this.date = date.clone().startOf("day");
        this.type = type;
        this.isStaleFilter = isStaleFilter;
        this.staleWindowDays = staleWindowDays;
        this.toDate = toDate?.endOf("day");
        if (this.toDate) {
            this.type = isStaleFilter ? CalendarItemType.StaleRange : CalendarItemType.Range;
            if(this.toDate.isBefore(this.date)) {
                [this.date, this.toDate] = [this.toDate.startOf("day"), this.date.endOf("day")];
            } 
        }
    }

    toString() {
        return CalendarItemType[this.type] + this.date.toString();
    }

    private getMomentTimeRange(period: moment.unitOfTime.StartOf) {
        const fromTime = moment(this.date).startOf(period);
        const toTime = moment(this.date).endOf(period);
        return { fromTime, toTime };
    }

    isInRange(date: moment.Moment) {
        if (this.type === CalendarItemType.All) {
            return true;
        }
        const { fromTime, toTime } = this.getTimeRange();
        const inRange = fromTime.isSameOrBefore(date) && toTime?.isSameOrAfter(date);
        return inRange;
    }

    getTimeRange() {
        switch (this.type) {
            case CalendarItemType.All:
                return { fromTime: moment(0), toTime: moment("9999-12-31") };
            case CalendarItemType.Year:
                return this.getMomentTimeRange("year");
                break;
            case CalendarItemType.Month:
                return this.getMomentTimeRange("month");
                break;
            case CalendarItemType.Week:
                return this.getMomentTimeRange("week");
                break;
            case CalendarItemType.Day:
                return this.getMomentTimeRange("day");
                break;
            case CalendarItemType.Range:
            case CalendarItemType.StaleRange:
                return { fromTime: this.date, toTime: this.toDate };
                break;
            default:
                throw new Error("Unknown Calendar Item Type!!!");
                break;
        }
    }
}
