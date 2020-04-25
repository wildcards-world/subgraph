describe("example", () => {
  it("should be 42", () => {
    let array = ["1", "2", "3"];
    let index = array.indexOf("2");
    array.splice(index, 1);
    let newIndex = array.indexOf("2");
    expect<i32>(index).toBe(
      1,
      "it should have the correct index at the beginning"
    );
    expect<i32>(newIndex).toBe(-1, "is it working??");
    expect<i32>(array.length).toBe(
      2,
      "The new array should have one less Item in it"
    );
    expect<i32>(19 + 23).toBe(42, "19 + 23 is 42");
  });
});
