const paginate = (schema) => {
  schema.statics.paginate = async function (filter, options = {}) {
    let sort = "";

    if (options.sortBy) {
      const sortingCriteria = [];

      options.sortBy.split(",").forEach((sortOption) => {
        const [key, order] = sortOption.split(":");
        sortingCriteria.push((order === "desc" ? "-" : "") + key);
      });

      sort = sortingCriteria.join(" ");
    } else {
      sort = "createdAt"; 
    }

    const limit =
      options.limit && parseInt(options.limit, 10) > 0
        ? parseInt(options.limit, 10)
        : 10;

    const page =
      options.page && parseInt(options.page, 10) > 0
        ? parseInt(options.page, 10)
        : 1;

    const skip = (page - 1) * limit;

    let docsQuery = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      if (typeof options.populate === "string") {
        options.populate.split(",").forEach((populateOption) => {
          docsQuery = docsQuery.populate({
            path: populateOption.trim(),
            strictPopulate: false,
          });
        });
      } else if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          docsQuery = docsQuery.populate({
            ...pop,
            strictPopulate: false,
          });
        });
      } else if (typeof options.populate === "object") {
        docsQuery = docsQuery.populate({
          ...options.populate,
          strictPopulate: false,
        });
      }
    }

    const countPromise = this.countDocuments(filter).exec();
    const docsPromise = docsQuery.exec();

    const [totalResults, results] = await Promise.all([
      countPromise,
      docsPromise,
    ]);

    const totalPages = Math.ceil(totalResults / limit);

    return {
      results,
      page,
      limit,
      totalPages,
      totalResults,
    };
  };
};

module.exports = paginate;