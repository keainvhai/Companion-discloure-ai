"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Conversations", "aiType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "companion", // 或 neutral / baseline
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Conversations", "aiType");
  },
};
