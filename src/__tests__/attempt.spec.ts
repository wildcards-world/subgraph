import { removeFromArrayAtIndex } from "../util";

// NOTE: these tests aren't working correctly now, the node_modules imports aren't resolving unfortunately...
describe("Util", () => {
  describe("removeFromArrayAtIndex", () => {
    it("remove from array at index", () => {
      let array = ["1", "2", "3", "4"];
      let arrayLengthBefore = array.length;
      let index = array.indexOf("2");

      let newArray = removeFromArrayAtIndex(array, index);
      let newIndex = newArray.indexOf("2");

      expect<i32>(index).toBe(
        1,
        "it should have the correct index at the beginning"
      );
      expect<i32>(newIndex).toBe(
        -1,
        "the item shoul no longer be in the array"
      );
      expect<i32>(array.length).toBe(
        arrayLengthBefore,
        "the original array should have the correct length, same as before the operation"
      );
      expect<i32>(newArray.length).toBe(
        arrayLengthBefore - 1,
        "the new array should have 1 less item in it"
      );
    });
    it("should return the same array if index is out of bounds", () => {
      let array = ["1", "2", "3", "4"];
      let arrayLengthBefore = array.length;
      let firstIndex = -1;
      let secondIndex = arrayLengthBefore;

      let newArrayFirst = removeFromArrayAtIndex(array, firstIndex);
      let newArraySecond = removeFromArrayAtIndex(array, secondIndex);

      expect<i32>(array.length).toBe(
        arrayLengthBefore,
        "the original array should have the correct length, same as before the operation"
      );
      expect<i32>(newArrayFirst.length).toBe(
        arrayLengthBefore,
        "The index is out of bounds, so the new array should be the same length."
      );
      expect<i32>(newArraySecond.length).toBe(
        arrayLengthBefore,
        "The index is out of bounds, so the new array should be the same length."
      );
    });
  });
});
