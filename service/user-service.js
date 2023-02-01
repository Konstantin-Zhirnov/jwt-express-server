const UserModel = require('../models/user-model');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mailService = require('./mail-service');
const tokenService = require('./token-service');
const UserDTO = require('../dtos/user-dto');
const ApiError = require('../exceptions/api-error');

class UserService {
  async registration(email, password, name) {
    const candidate = await UserModel.findOne({email});

    if (candidate) {
      throw ApiError.BadRequest(`The user with the email address ${email} already exists`)
    }
    const hashPassword = await bcrypt.hash(password, 3);
    const activationLink = uuid.v4();
    const user = await UserModel.create({email, password: hashPassword, activationLink, name});
    await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`);

    const userDTO = new UserDTO(user);
    const tokens = tokenService.generateTokens({...userDTO});
    await tokenService.saveToken(userDTO.id, tokens.refreshToken);

    return { ...tokens, user: userDTO }
  }

  async activate(link) {
    const user = await UserModel.findOne({link});
    if (!user) {
      throw ApiError.BadRequest('Bad activation link');
    }
    user.isActivated = true;
    await user.save();
    return user
  }

  async login(email, password) {
    const user = await UserModel.findOne({email});
    if (!user) {
      throw ApiError.BadRequest('The user with this email was not found');
    }
    const isPassEqual = await bcrypt.compare(password, user.password);
    if (!isPassEqual) {
      throw ApiError.BadRequest('Invalid password');
    }
    const userDTO = new UserDTO(user);
    const tokens = tokenService.generateTokens({...userDTO});
    await tokenService.saveToken(userDTO.id, tokens.refreshToken);

    return { ...tokens, user: userDTO }
  }

  async logout(refreshToken) {
    const token = await tokenService.removeToken(refreshToken);
    return token;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }
    const userData = tokenService.validateRefreshToken(refreshToken);
    const tokenFromDB = await tokenService.findToken(refreshToken);
    if (!userData || !tokenFromDB) {
      throw ApiError.UnauthorizedError();
    }

    const user = await UserModel.findById(userData.id);
    const userDTO = new UserDTO(user);
    const tokens = tokenService.generateTokens({...userDTO});
    await tokenService.saveToken(userDTO.id, tokens.refreshToken);

    return { ...tokens, user: userDTO }
  }

  async getAllUsers() {
    const users = await UserModel.find();
    return users;
  }

  async getUser(email) {
    const user = await UserModel.findOne({email});
    return user;
  }
}


module.exports = new UserService();