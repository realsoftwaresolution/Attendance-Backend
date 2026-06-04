const { AppError } = require("./AppError");

exports.validateSlabRanges = (slabs) => {
    const sorted = [...slabs].sort(
        (a, b) => Number(a.FromAmt) - Number(b.FromAmt)
    );

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (Number(current.FromAmt) > Number(current.ToAmt)) {
            throw new AppError(
                `Invalid slab range ${current.FromAmt} - ${current.ToAmt}`,
                400
            );
        }

        if (i > 0) {
            const prev = sorted[i - 1];

            if (Number(current.FromAmt) <= Number(prev.ToAmt)) {
                throw new AppError(
                    `Amount range overlap between ${prev.FromAmt}-${prev.ToAmt} and ${current.FromAmt}-${current.ToAmt}`,
                    400
                );
            }
        }
    }
}
