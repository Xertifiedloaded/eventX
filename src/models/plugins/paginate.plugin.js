const paginate = (schema) => {
  schema.statics.paginate = async function (filter, options) {
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = [];
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = '-createdAt';
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0
      ? parseInt(options.limit, 10)
      : 10;

    const page = options.page && parseInt(options.page, 10) > 0
      ? parseInt(options.page, 10)
      : 1;

    const skip = (page - 1) * limit;

    let docsPromise = this.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // ✅ FIXED POPULATE HANDLING
    if (options.populate) {
      if (typeof options.populate === 'string') {
        options.populate.split(',').forEach((populateOption) => {
          docsPromise = docsPromise.populate(populateOption.trim());
        });
      } else if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          docsPromise = docsPromise.populate(pop);
        });
      } else if (typeof options.populate === 'object') {
        docsPromise = docsPromise.populate(options.populate);
      }
    }

    const countPromise = this.countDocuments(filter).exec();

    const [totalResults, results] = await Promise.all([
      countPromise,
      docsPromise.exec(),
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