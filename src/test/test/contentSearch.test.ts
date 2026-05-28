import { assert } from "chai";
import { contentSearch } from "../../contentSearch";
import { getTestSetups } from "../testSetup/contentSearch.testSetup";

type SetupsType = ReturnType<typeof getTestSetups>;

describe("ContentSearch", () => {
  let setups: SetupsType;

  before(() => {
    setups = getTestSetups();
  });
  afterEach(() => setups.afterEach());

  describe("search", () => {
    it("should return results when query matches file content", async () => {
      setups.search.setupForReturningResultsWhenQueryMatchesContent();
      const results = await contentSearch.search("FooBar");

      assert.equal(results.length, 1);
      assert.equal(results[0].isContentMatch, true);
      assert.equal(results[0].symbolKind, -1);
    });

    it("should return empty array when content search is disabled", async () => {
      setups.search.setupForReturningEmptyArrayWhenContentSearchDisabled();
      const results = await contentSearch.search("FooBar");

      assert.deepEqual(results, []);
    });

    it("should return empty array when query is too short", async () => {
      setups.search.setupForReturningEmptyArrayWhenQueryTooShort();
      const results = await contentSearch.search("F");

      assert.deepEqual(results, []);
    });

    it("should return empty array when query is empty", async () => {
      const results = await contentSearch.search("");

      assert.deepEqual(results, []);
    });

    it("should return empty array when no match is found", async () => {
      setups.search.setupForReturningEmptyArrayWhenNoMatchFound();
      const results = await contentSearch.search("NonExistentContent");

      assert.deepEqual(results, []);
    });

    it("should skip files larger than maxFileSizeKb", async () => {
      setups.search.setupForSkippingFilesLargerThanMaxSize();
      const results = await contentSearch.search("FooBar");

      // Only the small file should be searched
      assert.equal(results.length, 1);
      assert.equal(results[0].detail, "/workspace/small.vue");
    });

    it("should respect maxResults limit", async () => {
      setups.search.setupForRespectingMaxResults();
      const results = await contentSearch.search("FooBar");

      assert.equal(results.length, 1);
    });

    it("should perform case-insensitive search", async () => {
      setups.search.setupForPerformingCaseInsensitiveSearch();
      const results = await contentSearch.search("foobar");

      assert.equal(results.length, 1);
      assert.equal(results[0].isContentMatch, true);
    });
  });
});