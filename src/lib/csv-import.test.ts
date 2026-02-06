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
      expect(session.amount_right_ml).toBe(0);
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
});
