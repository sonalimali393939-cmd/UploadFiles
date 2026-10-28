const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Post = require('../models/Post');

// In-memory collections
const usersStore = [];
const postsStore = [];

let isInitialized = false;

function createUserDoc(user) {
  return {
    ...user,
    _id: user._id,
    comparePassword: async function (candidate) {
      return bcrypt.compare(candidate, user.password);
    },
    save: async function () {
      user.role = this.role;
      user.name = this.name;
      user.updatedAt = new Date();
      this.updatedAt = user.updatedAt;
      return this;
    },
    toJSON() {
      const copy = { ...this };
      delete copy.password;
      delete copy.__v;
      return copy;
    },
    toObject() {
      const copy = { ...this };
      delete copy.password;
      delete copy.__v;
      return copy;
    },
  };
}

function clonePost(p) {
  return {
    _id: p._id,
    title: p.title,
    description: p.description,
    content: p.content,
    image: p.image || '',
    category: p.category,
    createdBy: p.createdBy,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    save: async function () {
      p.title = this.title;
      p.description = this.description;
      p.content = this.content;
      p.image = this.image;
      p.category = this.category;
      p.status = this.status;
      p.updatedAt = new Date();
      this.updatedAt = p.updatedAt;
      return this;
    },
    toJSON() {
      const copy = { ...this };
      delete copy.__v;
      return copy;
    },
  };
}

function createFindQuery(filteredArray) {
  let result = [...filteredArray];
  let populateField = null;

  const queryObj = {
    populate(field) {
      populateField = field;
      return queryObj;
    },
    sort(sortOptions) {
      if (sortOptions && sortOptions.createdAt === -1) {
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (sortOptions && sortOptions.createdAt === 1) {
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      return queryObj;
    },
    skip(n) {
      result = result.slice(n);
      return queryObj;
    },
    limit(n) {
      result = result.slice(0, n);
      return queryObj;
    },
    then(resolve, reject) {
      const finalResult = result.map((p) => {
        const cloned = clonePost(p);
        if (populateField && populateField.includes('createdBy') && cloned.createdBy) {
          const user = usersStore.find(
            (u) => u._id.toString() === cloned.createdBy.toString()
          );
          if (user) {
            cloned.createdBy = {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        return cloned;
      });
      return Promise.resolve(finalResult).then(resolve, reject);
    },
  };
  return queryObj;
}

function enableInMemoryDatabase() {
  if (isInitialized) return;
  isInitialized = true;

  // Mock User.findOne
  User.findOne = function (query) {
    let user = null;
    if (query && query.email) {
      user = usersStore.find(
        (u) => u.email.toLowerCase() === query.email.toLowerCase()
      );
    }

    if (!user) {
      const nullQuery = {
        select() {
          return nullQuery;
        },
        then(resolve, reject) {
          return Promise.resolve(null).then(resolve, reject);
        },
      };
      return nullQuery;
    }

    let includePassword = false;
    const doc = createUserDoc(user);

    const queryObj = {
      select(fields) {
        if (fields && fields.includes('+password')) {
          includePassword = true;
        }
        return queryObj;
      },
      then(resolve, reject) {
        const resDoc = { ...doc };
        if (!includePassword) {
          delete resDoc.password;
        }
        return Promise.resolve(resDoc).then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Mock User.create
  User.create = async function (userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const user = {
      _id: new mongoose.Types.ObjectId(),
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersStore.push(user);
    return createUserDoc(user);
  };

  // Mock User.findById
  User.findById = function (id) {
    const user = usersStore.find((u) => u._id.toString() === id.toString());
    if (!user) {
      return Promise.resolve(null);
    }
    return Promise.resolve(createUserDoc(user));
  };

  // Mock Post.create
  Post.create = async function (postData) {
    const post = {
      _id: new mongoose.Types.ObjectId(),
      title: postData.title,
      description: postData.description,
      content: postData.content,
      image: postData.image || '',
      category: (postData.category || '').toLowerCase().trim(),
      createdBy: postData.createdBy,
      status: postData.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    postsStore.push(post);
    return clonePost(post);
  };

  // Mock Post.find
  Post.find = function (query = {}) {
    let filtered = [...postsStore];

    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.createdBy) {
      filtered = filtered.filter(
        (p) => p.createdBy.toString() === query.createdBy.toString()
      );
    }
    if (query.category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === query.category.toLowerCase()
      );
    }
    if (query.$or) {
      filtered = filtered.filter((p) => {
        return query.$or.some((condition) => {
          if (condition.title && condition.title instanceof RegExp) {
            return condition.title.test(p.title);
          }
          if (condition.description && condition.description instanceof RegExp) {
            return condition.description.test(p.description);
          }
          return false;
        });
      });
    }

    return createFindQuery(filtered);
  };

  // Mock Post.countDocuments
  Post.countDocuments = async function (query = {}) {
    let filtered = [...postsStore];
    if (query.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }
    if (query.createdBy) {
      filtered = filtered.filter(
        (p) => p.createdBy.toString() === query.createdBy.toString()
      );
    }
    if (query.category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === query.category.toLowerCase()
      );
    }
    if (query.$or) {
      filtered = filtered.filter((p) => {
        return query.$or.some((condition) => {
          if (condition.title && condition.title instanceof RegExp) {
            return condition.title.test(p.title);
          }
          if (condition.description && condition.description instanceof RegExp) {
            return condition.description.test(p.description);
          }
          return false;
        });
      });
    }
    return filtered.length;
  };

  // Mock Post.findById
  Post.findById = function (id) {
    const p = postsStore.find((item) => item._id.toString() === id.toString());
    if (!p) {
      const nullQuery = {
        populate() {
          return nullQuery;
        },
        then(resolve, reject) {
          return Promise.resolve(null).then(resolve, reject);
        },
      };
      return nullQuery;
    }

    const doc = clonePost(p);
    let populateField = null;

    const queryObj = {
      populate(field) {
        populateField = field;
        if (field && field.includes('createdBy') && doc.createdBy) {
          const user = usersStore.find(
            (u) => u._id.toString() === doc.createdBy.toString()
          );
          if (user) {
            doc.createdBy = {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        return queryObj;
      },
      then(resolve, reject) {
        return Promise.resolve(doc).then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Mock Post.deleteOne
  Post.deleteOne = async function (query) {
    const id = query._id ? query._id.toString() : null;
    const index = postsStore.findIndex((p) => p._id.toString() === id);
    if (index !== -1) {
      postsStore.splice(index, 1);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  };
}

module.exports = {
  enableInMemoryDatabase,
  usersStore,
  postsStore,
};
