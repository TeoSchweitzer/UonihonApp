
memory = {}

def real_curse(nums):
    l = len(nums)
    if l == 0: return 0
    if l == 1: return nums[0]
    if l == 2: return nums[0] if nums[0] > nums[1] else nums[1]
    if l == 3: return nums[0] + nums[2] if nums[0] + nums[2] > nums[1] else nums[1]

    len_val_1 = len(nums)
    val1 = nums.pop(0)
    len_val_2 = len(nums)
    val2 = nums.pop(0)

    if (memory.get(len_val_1)) is None:
        memory[len_val_1] = val1 + real_curse(list(nums))

    if (memory.get(len_val_2)) is None:
        nums.pop(0)
        memory[len_val_2] = val2 + real_curse(list(nums))

    return memory[len_val_1] if memory[len_val_1] > memory[len_val_2] else memory[len_val_2]


print(real_curse([226,174,214,16,218,48,153,131,128,17,157,142,88,43,37,157,43,221,191,68,206,23,225,82,54,118,111,46,80,49,245,63,25,194,72,80,143,55,209,18,55,122,65,66,177,101,63,201,172,130,103,225,142,46,86,185,62,138,212,192,125,77,223,188,99,228,90,25,193,211,84,239,119,234,85,83,123,120,131,203,219,10,82,35,120,180,249,106,37,169,225,54,103,55,166,124]))


