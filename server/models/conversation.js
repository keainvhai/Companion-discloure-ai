"use strict";
module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define("Conversation", {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // 支持匿名用户
    },
    aiType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "companion",
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Conversation.associate = (models) => {
    Conversation.hasMany(models.Message, {
      foreignKey: "conversationId",
      as: "messages",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Conversation;
};
